import { ShoppingBag, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function Layout() {
  const { cartCount, currentUser } = useStore();

  return (
    <div className="app-frame">
      <nav className="top-nav brutal-block">
        <div className="brand-wrap">
          <div className="brand-tag">Storefront</div>
          <NavLink to="/" className="brand-mark">
            EARTH/CO
          </NavLink>
        </div>

        <div className="nav-links">
          <NavLink to="/shop" className="chip-link">
            Shop
          </NavLink>
          {currentUser?.isAdmin ? (
            <NavLink to="/admin" className="chip-link">
              Admin
            </NavLink>
          ) : null}
          <NavLink to="/account" className="chip-link">
            Account
          </NavLink>
          <NavLink to="/auth" className={({ isActive }) => `chip-link${isActive ? " active" : ""}${!currentUser ? " chip-link-cta" : ""}`}>
            {currentUser ? "Switch User" : "Login/Register"}
          </NavLink>
          <NavLink to="/cart" className="btn btn-light icon-btn">
            <ShoppingBag size={18} />
            Cart ({cartCount})
          </NavLink>
          <NavLink to="/account" className="btn btn-moss icon-btn">
            <UserRound size={18} />
            {currentUser ? currentUser.name.split(" ")[0] : "Guest"}
          </NavLink>
        </div>
      </nav>

      <Outlet />

      <footer className="footer brutal-block">
        <div>
          <h3>EARTH/CO MARKET</h3>
          <p>Structured commerce with grounded materials and modern utility.</p>
        </div>
        <div>
          <h4>Customer</h4>
          <p>Shipping</p>
          <p>Returns</p>
          <p>Support</p>
        </div>
        <div>
          <h4>Collections</h4>
          <p>Outerwear</p>
          <p>Footwear</p>
          <p>Bags</p>
        </div>
        <div>
          <h4>Build</h4>
          <p>React + TypeScript</p>
          <p>Express API + Prisma ORM</p>
          <p>Postgres-backed auth/cart/orders</p>
        </div>
      </footer>
    </div>
  );
}
