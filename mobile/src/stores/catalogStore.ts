import { create } from "zustand";
import { apiClient } from "../api/client";

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  sku: string;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
  };
}

interface CatalogState {
  products: Product[];
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
  loadProducts: () => Promise<void>;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  products: [],
  status: "idle",
  error: null,

  loadProducts: async () => {
    set({ status: "loading", error: null });
    try {
      const response = await apiClient.get<{
        products: Product[];
      }>("/api/products");

      set({
        products: response.data.products || [],
        status: "success",
        error: null,
      });
    } catch (err: any) {
      set({
        status: "error",
        error:
          err.response?.data?.error ||
          err.message ||
          "Failed to load products",
      });
    }
  },
}));
