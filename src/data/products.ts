import type { Product } from "../types/models";

type ProductSeed = Omit<Product, "description" | "gallery"> & {
  description?: string;
  gallery?: string[];
};

const defaultDescriptions: Record<Product["category"], string> = {
  OUTERWEAR:
    "Weather-tuned layering piece with structured shape, durable fabric, and everyday utility detailing.",
  FOOTWEAR:
    "Grounded comfort with trail-capable grip and long-wear cushioning for city and weekend movement.",
  BAGS:
    "Organized carry architecture built for commute, travel, and modular daily gear loads.",
  ACCESSORIES:
    "Functional finishing piece with clean lines and durable materials for daily rotation.",
  ESSENTIALS:
    "Core wardrobe staple with balanced weight, clean fit, and reliable all-season wearability."
};

const categoryGalleries: Record<Product["category"], string[]> = {
  OUTERWEAR: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?auto=format&fit=crop&q=80&w=1200"
  ],
  FOOTWEAR: [
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=1200"
  ],
  BAGS: [
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?auto=format&fit=crop&q=80&w=1200"
  ],
  ACCESSORIES: [
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&q=80&w=1200"
  ],
  ESSENTIALS: [
    "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=1200"
  ]
};

const productSeeds: ProductSeed[] = [
  {
    id: 1,
    slug: "terra-boots",
    name: "TERRA.BOOTS",
    tagline: "All-terrain daily boot",
    description:
      "Structured leather upper with weather-ready sole and recycled lining, built for city gravel and weekend trail loops.",
    price: 195,
    category: "FOOTWEAR",
    accent: "#c9a87c",
    heroImage:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1200",
    stock: 17,
    rating: 4.8
  },
  {
    id: 2,
    slug: "moss-jacket",
    name: "MOSS.JACKET",
    tagline: "Insulated utility shell",
    description:
      "Relaxed cut field jacket with breathable insulation and storm flap, tuned for wind, mist, and layered winter fits.",
    price: 145,
    category: "OUTERWEAR",
    accent: "#7a8b5c",
    heroImage:
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=1200",
    stock: 12,
    rating: 4.6
  },
  {
    id: 3,
    slug: "clay-bag",
    name: "CLAY.BAG",
    tagline: "Expandable crossbody",
    description:
      "Modular interior and matte waxed canvas shell. Carries laptop, market haul, and weekend essentials in one clean block.",
    price: 85,
    category: "BAGS",
    accent: "#c67a4a",
    heroImage:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80&w=1200",
    stock: 20,
    rating: 4.7
  },
  {
    id: 4,
    slug: "stone-shades",
    name: "STONE.SHADES",
    tagline: "Mineral tint eyewear",
    description:
      "UV400 polarized lenses set in sculpted acetate frames. Sharp silhouette designed for bright noon light.",
    price: 155,
    category: "ACCESSORIES",
    accent: "#8b7355",
    heroImage:
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=1200",
    stock: 9,
    rating: 4.5
  },
  {
    id: 5,
    slug: "loam-knit",
    name: "LOAM.KNIT",
    tagline: "Textured heavyweight crew",
    description:
      "Dense organic cotton knit with ribbed architecture and dropped shoulder. Warm hand-feel with minimal lint.",
    price: 110,
    category: "ESSENTIALS",
    accent: "#a9896b",
    heroImage:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1200",
    stock: 28,
    rating: 4.6
  },
  {
    id: 6,
    slug: "basalt-pack",
    name: "BASALT.PACK",
    tagline: "Commuter roll-top",
    description:
      "Abrasion-resistant body with welded seams and quick-release top closure. Built for daily laptop and camera carry.",
    price: 135,
    category: "BAGS",
    accent: "#5c6b52",
    heroImage:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=1200",
    stock: 14,
    rating: 4.8
  },
  {
    id: 7,
    slug: "spruce-parka",
    name: "SPRUCE.PARKA",
    tagline: "Longline weather shell",
    description:
      "Extended hem and seam-sealed hood with matte hardware. A functional silhouette for cold rain and urban wind.",
    price: 230,
    category: "OUTERWEAR",
    accent: "#66754f",
    heroImage:
      "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&q=80&w=1200",
    stock: 7,
    rating: 4.9
  },
  {
    id: 8,
    slug: "ochre-socks",
    name: "OCHRE.SOCKS",
    tagline: "Merino trail pair",
    description:
      "Cushioned heel, ventilated toe box, and anti-slip arch support. Designed for long walks and all-day boots.",
    price: 28,
    category: "ESSENTIALS",
    accent: "#c69d5a",
    heroImage:
      "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&q=80&w=1200",
    stock: 41,
    rating: 4.4
  },
  {
    id: 9,
    slug: "dune-runner",
    name: "DUNE.RUNNER",
    tagline: "Lightweight path sneaker",
    price: 125,
    category: "FOOTWEAR",
    accent: "#b69672",
    heroImage:
      "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&q=80&w=1200",
    stock: 22,
    rating: 4.5
  },
  {
    id: 10,
    slug: "river-clog",
    name: "RIVER.CLOG",
    tagline: "Slip-on utility clog",
    price: 98,
    category: "FOOTWEAR",
    accent: "#9a7b58",
    heroImage:
      "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&q=80&w=1200",
    stock: 26,
    rating: 4.2
  },
  {
    id: 11,
    slug: "cedar-trainer",
    name: "CEDAR.TRAINER",
    tagline: "Daily movement trainer",
    price: 132,
    category: "FOOTWEAR",
    accent: "#7c8b69",
    heroImage:
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&q=80&w=1200",
    stock: 18,
    rating: 4.6
  },
  {
    id: 12,
    slug: "shale-hiker",
    name: "SHALE.HIKER",
    tagline: "Mid-height terrain hiker",
    price: 210,
    category: "FOOTWEAR",
    accent: "#6f654f",
    heroImage:
      "https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&q=80&w=1200",
    stock: 11,
    rating: 4.7
  },
  {
    id: 13,
    slug: "marl-coat",
    name: "MARL.COAT",
    tagline: "Wool blend city coat",
    price: 260,
    category: "OUTERWEAR",
    accent: "#8f745c",
    heroImage:
      "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1200",
    stock: 10,
    rating: 4.6
  },
  {
    id: 14,
    slug: "ridge-shell",
    name: "RIDGE.SHELL",
    tagline: "Packable storm shell",
    price: 178,
    category: "OUTERWEAR",
    accent: "#6f7f59",
    heroImage:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1200",
    stock: 16,
    rating: 4.4
  },
  {
    id: 15,
    slug: "branch-vest",
    name: "BRANCH.VEST",
    tagline: "Layer-ready insulated vest",
    price: 122,
    category: "OUTERWEAR",
    accent: "#7b6c57",
    heroImage:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&q=80&w=1200",
    stock: 24,
    rating: 4.3
  },
  {
    id: 16,
    slug: "thicket-anorak",
    name: "THICKET.ANORAK",
    tagline: "Half-zip field anorak",
    price: 165,
    category: "OUTERWEAR",
    accent: "#5f7452",
    heroImage:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1200",
    stock: 15,
    rating: 4.5
  },
  {
    id: 17,
    slug: "canopy-blazer",
    name: "CANOPY.BLAZER",
    tagline: "Relaxed workwear blazer",
    price: 189,
    category: "OUTERWEAR",
    accent: "#8a7a63",
    heroImage:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1200",
    stock: 13,
    rating: 4.1
  },
  {
    id: 18,
    slug: "willow-puffer",
    name: "WILLOW.PUFFER",
    tagline: "Quilted cold-weather puffer",
    price: 240,
    category: "OUTERWEAR",
    accent: "#7b8767",
    heroImage:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=1200",
    stock: 8,
    rating: 4.7
  },
  {
    id: 19,
    slug: "bark-overcoat",
    name: "BARK.OVERCOAT",
    tagline: "Structured long overcoat",
    price: 285,
    category: "OUTERWEAR",
    accent: "#8d6f52",
    heroImage:
      "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=1200",
    stock: 6,
    rating: 4.6
  },
  {
    id: 20,
    slug: "harbor-raincoat",
    name: "HARBOR.RAINCOAT",
    tagline: "Waterproof commuter coat",
    price: 205,
    category: "OUTERWEAR",
    accent: "#607054",
    heroImage:
      "https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&q=80&w=1200",
    stock: 12,
    rating: 4.5
  },
  {
    id: 21,
    slug: "sage-tote",
    name: "SAGE.TOTE",
    tagline: "Open-top market tote",
    price: 72,
    category: "BAGS",
    accent: "#7f8d6f",
    heroImage:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1200",
    stock: 29,
    rating: 4.2
  },
  {
    id: 22,
    slug: "fern-duffel",
    name: "FERN.DUFFEL",
    tagline: "Weekend duffel carry",
    price: 148,
    category: "BAGS",
    accent: "#5d7557",
    heroImage:
      "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&q=80&w=1200",
    stock: 14,
    rating: 4.6
  },
  {
    id: 23,
    slug: "quarry-sling",
    name: "QUARRY.SLING",
    tagline: "Compact chest sling",
    price: 68,
    category: "BAGS",
    accent: "#7e6a53",
    heroImage:
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&q=80&w=1200",
    stock: 27,
    rating: 4.3
  },
  {
    id: 24,
    slug: "root-pouch",
    name: "ROOT.POUCH",
    tagline: "Daily essentials pouch",
    price: 38,
    category: "BAGS",
    accent: "#9a784f",
    heroImage:
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=1200",
    stock: 37,
    rating: 4.1
  },
  {
    id: 25,
    slug: "tundra-carryall",
    name: "TUNDRA.CARRYALL",
    tagline: "Oversized travel carryall",
    price: 178,
    category: "BAGS",
    accent: "#6e7359",
    heroImage:
      "https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&q=80&w=1200",
    stock: 12,
    rating: 4.7
  },
  {
    id: 26,
    slug: "grain-brief",
    name: "GRAIN.BRIEF",
    tagline: "Structured brief case",
    price: 162,
    category: "BAGS",
    accent: "#7d6652",
    heroImage:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=1200",
    stock: 9,
    rating: 4.5
  },
  {
    id: 27,
    slug: "mica-camera-bag",
    name: "MICA.CAMERA.BAG",
    tagline: "Protective camera satchel",
    price: 119,
    category: "BAGS",
    accent: "#697b62",
    heroImage:
      "https://images.unsplash.com/photo-1614179689702-355944cd0918?auto=format&fit=crop&q=80&w=1200",
    stock: 19,
    rating: 4.4
  },
  {
    id: 28,
    slug: "canyon-satchel",
    name: "CANYON.SATCHEL",
    tagline: "Slim messenger satchel",
    price: 104,
    category: "BAGS",
    accent: "#8b704f",
    heroImage:
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&q=80&w=1200",
    stock: 23,
    rating: 4.3
  },
  {
    id: 29,
    slug: "copper-belt",
    name: "COPPER.BELT",
    tagline: "Vegetable-tan leather belt",
    price: 52,
    category: "ACCESSORIES",
    accent: "#9a6e43",
    heroImage:
      "https://images.unsplash.com/photo-1618677366787-9727aacca7ea?auto=format&fit=crop&q=80&w=1200",
    stock: 30,
    rating: 4.2
  },
  {
    id: 30,
    slug: "linen-cap",
    name: "LINEN.CAP",
    tagline: "Breathable six-panel cap",
    price: 34,
    category: "ACCESSORIES",
    accent: "#7f8a64",
    heroImage:
      "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&q=80&w=1200",
    stock: 34,
    rating: 4.1
  },
  {
    id: 31,
    slug: "sand-scarf",
    name: "SAND.SCARF",
    tagline: "Soft weave utility scarf",
    price: 46,
    category: "ACCESSORIES",
    accent: "#b79265",
    heroImage:
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1200",
    stock: 21,
    rating: 4.5
  },
  {
    id: 32,
    slug: "river-watch",
    name: "RIVER.WATCH",
    tagline: "Field-inspired timepiece",
    price: 175,
    category: "ACCESSORIES",
    accent: "#667456",
    heroImage:
      "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&q=80&w=1200",
    stock: 11,
    rating: 4.6
  },
  {
    id: 33,
    slug: "hemlock-tee",
    name: "HEMLOCK.TEE",
    tagline: "Heavyweight box tee",
    price: 42,
    category: "ESSENTIALS",
    accent: "#78845e",
    heroImage:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1200",
    stock: 43,
    rating: 4.4
  },
  {
    id: 34,
    slug: "adobe-chino",
    name: "ADOBE.CHINO",
    tagline: "Relaxed tapered chino",
    price: 92,
    category: "ESSENTIALS",
    accent: "#9a7c58",
    heroImage:
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=1200",
    stock: 26,
    rating: 4.3
  },
  {
    id: 35,
    slug: "flint-jogger",
    name: "FLINT.JOGGER",
    tagline: "Tapered performance jogger",
    price: 88,
    category: "ESSENTIALS",
    accent: "#6f765b",
    heroImage:
      "https://images.unsplash.com/photo-1506629905607-4e5a1c42f7f2?auto=format&fit=crop&q=80&w=1200",
    stock: 24,
    rating: 4.2
  },
  {
    id: 36,
    slug: "wheat-henley",
    name: "WHEAT.HENLEY",
    tagline: "Long-sleeve henley base",
    price: 58,
    category: "ESSENTIALS",
    accent: "#aa8c67",
    heroImage:
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=1200",
    stock: 28,
    rating: 4.5
  },
  {
    id: 37,
    slug: "dusk-thermal",
    name: "DUSK.THERMAL",
    tagline: "Waffle-knit thermal top",
    price: 64,
    category: "ESSENTIALS",
    accent: "#7f6c56",
    heroImage:
      "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&q=80&w=1200",
    stock: 20,
    rating: 4.6
  },
  {
    id: 38,
    slug: "pebble-shirt",
    name: "PEBBLE.SHIRT",
    tagline: "Crisp oxford shirt",
    price: 86,
    category: "ESSENTIALS",
    accent: "#6f8168",
    heroImage:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=1200",
    stock: 19,
    rating: 4.4
  },
  {
    id: 39,
    slug: "grove-short",
    name: "GROVE.SHORT",
    tagline: "Drawcord utility short",
    price: 54,
    category: "ESSENTIALS",
    accent: "#9a825f",
    heroImage:
      "https://images.unsplash.com/photo-1565693413579-8ee9ebf6f4b1?auto=format&fit=crop&q=80&w=1200",
    stock: 33,
    rating: 4.1
  },
  {
    id: 40,
    slug: "silt-hoodie",
    name: "SILT.HOODIE",
    tagline: "Relaxed fleece hoodie",
    price: 98,
    category: "ESSENTIALS",
    accent: "#6c755d",
    heroImage:
      "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&q=80&w=1200",
    stock: 25,
    rating: 4.7
  }
];

export const products: Product[] = productSeeds.map((product) => ({
  ...product,
  description: product.description ?? defaultDescriptions[product.category],
  gallery: product.gallery ?? categoryGalleries[product.category]
}));
