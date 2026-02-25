import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import ProductCard from "../components/ProductCard";
import { useStore } from "../context/StoreContext";

const spotlightProjects = [
	{
		title: "RIDGELINE PROJECT",
		description: "Layering system for wind and temperature shifts.",
		route: "/shop",
	},
	{
		title: "URBAN CLAY PROJECT",
		description: "Muted earth palette for workday-to-weekend rotation.",
		route: "/shop",
	},
	{
		title: "PACK LIGHT PROJECT",
		description: "Carry strategy and modular accessories for movement.",
		route: "/shop",
	},
];

export default function HomePage() {
	const { products, addToCart } = useStore();
	const featured = products.slice(0, 4);

	return (
		<PageShell>
			<header className="hero-grid">
				<motion.article
					className="hero-left brutal-block"
					initial={{ scale: 0.98 }}
					animate={{ scale: 1 }}
					transition={{ duration: 0.4 }}
				>
					<h1>
						ROOTED
						<br />
						STYLE
					</h1>
					<p>
						ORGANIC COLLECTION
						<br />
						SUSTAINABLE FABRICATION
						<br />
						EARTH APPROVED
					</p>
					<div className="hero-actions">
						<Link to="/shop" className="btn btn-dark">
							Explore Shop
						</Link>
						<Link to="/auth" className="btn btn-light">
							Login/Register
						</Link>
					</div>
				</motion.article>

				<article className="hero-right brutal-block">
					<img
						src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=1400"
						alt="Earth-toned lookbook"
					/>
					<span className="sticker">NEW DROP</span>
				</article>
			</header>

			<section className="section-head brutal-block">
				<div>
					<h2>Collection Projects</h2>
					<p>Three curated style systems for everyday movement.</p>
				</div>
			</section>

			<section className="project-grid">
				{spotlightProjects.map((project) => (
					<article key={project.title} className="project-card brutal-block">
						<h3>{project.title}</h3>
						<p>{project.description}</p>
						<Link to={project.route} className="btn btn-light">
							Open Project
						</Link>
					</article>
				))}
			</section>

			<section className="section-head brutal-block">
				<div>
					<h2>Featured Products</h2>
					<p>Best sellers pulled from the current seasonal lineup.</p>
				</div>
			</section>

			<section className="product-grid">
				{featured.map((product) => (
					<ProductCard
						key={product.id}
						product={product}
						onAddToCart={addToCart}
					/>
				))}
			</section>
		</PageShell>
	);
}
