import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { products as fallbackProducts } from "../data/products";
import type { CartItem, Order, Product, SessionUser } from "../types/models";
import {
	ApiError,
	addCartItem,
	checkout,
	clearCart as clearCartApi,
	fetchCart,
	fetchOrders,
	fetchSession,
	getProducts,
	login as loginApi,
	logout as logoutApi,
	register as registerApi,
	removeCartItem,
	updateCartItem,
} from "../utils/api";

const STORAGE_KEYS = {
	guestCart: "earthco.guestCart",
	authToken: "earthco.authToken",
};

interface CheckoutPayload {
	fullName: string;
	email: string;
	address: string;
	city: string;
	zip: string;
	country: string;
}

interface CartLine {
	product: Product;
	quantity: number;
	lineTotal: number;
}

interface StoreContextValue {
	authToken: string | null;
	products: Product[];
	cart: CartItem[];
	cartLines: CartLine[];
	cartCount: number;
	cartSubtotal: number;
	shippingCost: number;
	cartTotal: number;
	currentUser: SessionUser | null;
	orders: Order[];
	register: (
		name: string,
		email: string,
		password: string,
	) => Promise<{ ok: boolean; message: string }>;
	login: (
		email: string,
		password: string,
	) => Promise<{ ok: boolean; message: string }>;
	logout: () => Promise<void>;
	addToCart: (productId: number, quantity?: number) => Promise<void>;
	updateCartQuantity: (productId: number, quantity: number) => Promise<void>;
	removeFromCart: (productId: number) => Promise<void>;
	clearCart: () => Promise<void>;
	placeOrder: (
		payload: CheckoutPayload,
	) => Promise<{ ok: boolean; message: string; orderId?: string }>;
	getProductBySlug: (slug: string) => Product | undefined;
	refreshProducts: () => Promise<void>;
	refreshOrders: () => Promise<void>;
	refreshUserData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

function readStorage<T>(key: string, fallback: T): T {
	const raw = localStorage.getItem(key);
	if (!raw) {
		return fallback;
	}

	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiError) {
		return error.message;
	}

	return fallback;
}

export function StoreProvider({ children }: { children: ReactNode }) {
	const [products, setProducts] = useState<Product[]>(fallbackProducts);
	const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
	const [token, setToken] = useState<string | null>(() =>
		readStorage<string | null>(STORAGE_KEYS.authToken, null),
	);
	const [cart, setCart] = useState<CartItem[]>(() =>
		readStorage<CartItem[]>(STORAGE_KEYS.guestCart, []),
	);
	const [orders, setOrders] = useState<Order[]>([]);

	const refreshProducts = useCallback(async () => {
		try {
			const response = await getProducts();
			setProducts(response.products);
		} catch {
			setProducts(fallbackProducts);
		}
	}, []);

	useEffect(() => {
		if (token) {
			localStorage.setItem(STORAGE_KEYS.authToken, JSON.stringify(token));
			return;
		}

		localStorage.removeItem(STORAGE_KEYS.authToken);
	}, [token]);

	useEffect(() => {
		if (currentUser) {
			localStorage.removeItem(STORAGE_KEYS.guestCart);
			return;
		}

		localStorage.setItem(STORAGE_KEYS.guestCart, JSON.stringify(cart));
	}, [cart, currentUser]);

	useEffect(() => {
		async function init() {
			await refreshProducts();

			if (!token) {
				return;
			}

			try {
				const [sessionResponse, cartResponse, ordersResponse] =
					await Promise.all([
						fetchSession(token),
						fetchCart(token),
						fetchOrders(token),
					]);

				setCurrentUser(sessionResponse.user);
				setCart(cartResponse.cart);
				setOrders(ordersResponse.orders);
			} catch {
				setToken(null);
				setCurrentUser(null);
				setOrders([]);
			}
		}

		void init();
	}, [refreshProducts, token]);

	const cartLines = useMemo<CartLine[]>(() => {
		return cart
			.map((item) => {
				const product = products.find((entry) => entry.id === item.productId);
				if (!product) {
					return null;
				}

				return {
					product,
					quantity: item.quantity,
					lineTotal: item.quantity * product.price,
				};
			})
			.filter((line): line is CartLine => Boolean(line));
	}, [cart, products]);

	const cartCount = useMemo(
		() => cart.reduce((sum, item) => sum + item.quantity, 0),
		[cart],
	);
	const cartSubtotal = useMemo(
		() => cartLines.reduce((sum, line) => sum + line.lineTotal, 0),
		[cartLines],
	);
	const shippingCost = useMemo(
		() => (cartSubtotal > 250 || cartSubtotal === 0 ? 0 : 12),
		[cartSubtotal],
	);
	const cartTotal = useMemo(
		() => cartSubtotal + shippingCost,
		[cartSubtotal, shippingCost],
	);

	async function hydrateUserData(activeToken: string) {
		const [cartResponse, ordersResponse] = await Promise.all([
			fetchCart(activeToken),
			fetchOrders(activeToken),
		]);

		setCart(cartResponse.cart);
		setOrders(ordersResponse.orders);
	}

	async function refreshOrders() {
		if (!token || !currentUser) {
			setOrders([]);
			return;
		}

		try {
			const response = await fetchOrders(token);
			setOrders(response.orders);
		} catch {
			setOrders([]);
		}
	}

	async function refreshUserData() {
		if (!token || !currentUser) {
			setCart([]);
			setOrders([]);
			return;
		}

		try {
			await hydrateUserData(token);
		} catch {
			setCart([]);
			setOrders([]);
		}
	}

	async function mergeGuestCartIntoAccount(
		activeToken: string,
		guestCart: CartItem[],
	) {
		if (guestCart.length === 0) {
			return;
		}

		for (const item of guestCart) {
			await addCartItem(activeToken, item.productId, item.quantity);
		}
	}

	async function register(name: string, email: string, password: string) {
		try {
			const guestCart = currentUser ? [] : cart;
			const response = await registerApi(name, email, password);

			setToken(response.token);
			setCurrentUser(response.user);
			await mergeGuestCartIntoAccount(response.token, guestCart);
			await hydrateUserData(response.token);

			return { ok: true, message: "Account created. You are now signed in." };
		} catch (error) {
			return {
				ok: false,
				message: errorMessage(error, "Unable to create account right now."),
			};
		}
	}

	async function login(email: string, password: string) {
		try {
			const guestCart = currentUser ? [] : cart;
			const response = await loginApi(email, password);

			setToken(response.token);
			setCurrentUser(response.user);
			await mergeGuestCartIntoAccount(response.token, guestCart);
			await hydrateUserData(response.token);

			return { ok: true, message: "Welcome back." };
		} catch (error) {
			return {
				ok: false,
				message: errorMessage(error, "Unable to sign in right now."),
			};
		}
	}

	async function logout() {
		if (token) {
			try {
				await logoutApi(token);
			} catch {
				// Continue clearing local state even if API logout fails.
			}
		}

		setToken(null);
		setCurrentUser(null);
		setCart([]);
		setOrders([]);
	}

	async function addToCart(productId: number, quantity = 1) {
		if (!currentUser || !token) {
			setCart((prev) => {
				const existing = prev.find((entry) => entry.productId === productId);
				if (existing) {
					return prev.map((entry) =>
						entry.productId === productId
							? { ...entry, quantity: Math.min(entry.quantity + quantity, 99) }
							: entry,
					);
				}

				return [...prev, { productId, quantity: Math.min(quantity, 99) }];
			});
			return;
		}

		try {
			const response = await addCartItem(token, productId, quantity);
			setCart(response.cart);
		} catch {
			// Keep UI stable on API errors.
		}
	}

	async function updateCartQuantity(productId: number, quantity: number) {
		if (quantity <= 0) {
			await removeFromCart(productId);
			return;
		}

		if (!currentUser || !token) {
			setCart((prev) =>
				prev.map((entry) =>
					entry.productId === productId
						? { ...entry, quantity: Math.min(quantity, 99) }
						: entry,
				),
			);
			return;
		}

		try {
			const response = await updateCartItem(token, productId, quantity);
			setCart(response.cart);
		} catch {
			// Keep UI stable on API errors.
		}
	}

	async function removeFromCart(productId: number) {
		if (!currentUser || !token) {
			setCart((prev) => prev.filter((entry) => entry.productId !== productId));
			return;
		}

		try {
			const response = await removeCartItem(token, productId);
			setCart(response.cart);
		} catch {
			// Keep UI stable on API errors.
		}
	}

	async function clearCart() {
		if (!currentUser || !token) {
			setCart([]);
			return;
		}

		try {
			const response = await clearCartApi(token);
			setCart(response.cart);
		} catch {
			// Keep UI stable on API errors.
		}
	}

	async function placeOrder(payload: CheckoutPayload) {
		if (!currentUser || !token) {
			return { ok: false, message: "Please sign in before checkout." };
		}

		try {
			const response = await checkout(token, payload);
			setOrders((prev) => [response.order, ...prev]);
			setCart([]);

			return {
				ok: true,
				message: "Order placed successfully.",
				orderId: response.order.orderCode ?? response.order.id,
			};
		} catch (error) {
			return {
				ok: false,
				message: errorMessage(error, "Checkout failed. Please try again."),
			};
		}
	}

	function getProductBySlug(slug: string) {
		return products.find((item) => item.slug === slug);
	}

	const value: StoreContextValue = {
		authToken: token,
		products,
		cart,
		cartLines,
		cartCount,
		cartSubtotal,
		shippingCost,
		cartTotal,
		currentUser,
		orders,
		register,
		login,
		logout,
		addToCart,
		updateCartQuantity,
		removeFromCart,
		clearCart,
		placeOrder,
		getProductBySlug,
		refreshProducts,
		refreshOrders,
		refreshUserData,
	};

	return (
		<StoreContext.Provider value={value}>{children}</StoreContext.Provider>
	);
}

export function useStore() {
	const context = useContext(StoreContext);
	if (!context) {
		throw new Error("useStore must be used inside StoreProvider.");
	}

	return context;
}
