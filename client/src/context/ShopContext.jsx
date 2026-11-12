import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ShopContext = createContext();

const sampleProducts = [
  {
    id: 1,
    name: 'Loom Black Shirt',
    category: 'Men\'s Fashion',
    price: 2490,
    salePrice: 1990,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
    badge: 'New',
    rating: 4.8,
    stock: 9,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'Stone']
  },
  {
    id: 2,
    name: 'Urban Luxe Hoodie',
    category: 'Hoodies',
    price: 3290,
    salePrice: 2790,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    badge: 'Hot',
    rating: 4.7,
    stock: 12,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Navy', 'Ash']
  },
  {
    id: 3,
    name: 'Classic Street Trousers',
    category: 'Pants',
    price: 2890,
    salePrice: 2290,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
    badge: 'Top Rated',
    rating: 4.9,
    stock: 7,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Charcoal', 'Khaki']
  },
  {
    id: 4,
    name: 'Signature Women Set',
    category: 'Women\'s Fashion',
    price: 3990,
    salePrice: 3290,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    badge: 'Sale',
    rating: 4.6,
    stock: 15,
    sizes: ['S', 'M', 'L'],
    colors: ['Plum', 'Cream']
  }
];

export function ShopProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('smart-cart') || '[]');
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('smart-wishlist') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('smart-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('smart-wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const addToCart = (product, size = 'M', color = 'Black', qty = 1) => {
    setCart((prev) => {
      const found = prev.find((item) => item.id === product.id && item.size === size && item.color === color);
      if (found) {
        return prev.map((item) =>
          item.id === product.id && item.size === size && item.color === color
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { ...product, size, color, quantity: qty }];
    });
  };

  const removeFromCart = (id, size, color) => {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.size === size && item.color === color)));
  };

  const updateCartQty = (id, size, color, quantity) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id && item.size === size && item.color === color ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const addToWishlist = (product) => {
    setWishlist((prev) => (prev.some((item) => item.id === product.id) ? prev : [...prev, product]));
  };

  const removeFromWishlist = (id) => {
    setWishlist((prev) => prev.filter((item) => item.id !== id));
  };

  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.salePrice || item.price) * item.quantity, 0), [cart]);

  return (
    <ShopContext.Provider
      value={{
        products: sampleProducts,
        cart,
        wishlist,
        addToCart,
        removeFromCart,
        updateCartQty,
        addToWishlist,
        removeFromWishlist,
        totalItems,
        subtotal
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  return useContext(ShopContext);
}
