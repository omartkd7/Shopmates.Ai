import { create } from "zustand";
import { apiClient } from "../api/client";

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  storeId?: number;
  name: string;
  description?: string;
  imageUrl?: string | null;
  price: number;
  stock: number;
  sku?: string;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
    description?: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CatalogState {
  products: Product[];
  categories: Category[];
  selectedCategoryId: number | null;
  search: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  hasMore: boolean;
  status: "idle" | "loading" | "loadingMore" | "success" | "error";
  error: string | null;

  setSearch: (search: string) => void;
  setSelectedCategory: (categoryId: number | null) => void;
  setPriceRange: (min?: number, max?: number) => void;
  fetchCategories: () => Promise<void>;
  fetchProducts: (refresh?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchProductDetails: (id: number) => Promise<Product | null>;
  resetFilters: () => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: [],
  categories: [],
  selectedCategoryId: null,
  search: "",
  minPrice: undefined,
  maxPrice: undefined,
  page: 1,
  hasMore: true,
  status: "idle",
  error: null,

  setSearch: (search: string) => {
    set({ search });
  },

  setSelectedCategory: (categoryId: number | null) => {
    set({ selectedCategoryId: categoryId });
  },

  setPriceRange: (min?: number, max?: number) => {
    set({ minPrice: min, maxPrice: max });
  },

  resetFilters: () => {
    set({
      search: "",
      selectedCategoryId: null,
      minPrice: undefined,
      maxPrice: undefined,
      page: 1,
    });
  },

  fetchCategories: async () => {
    try {
      const res = await apiClient.get<{ categories: Category[] }>("/api/categories");
      set({ categories: res.data.categories || [] });
    } catch {
      // Fallback categories if offline
    }
  },

  fetchProducts: async (refresh = false) => {
    const { search, selectedCategoryId, minPrice, maxPrice, status } = get();
    if (!refresh && status === "loading") return;

    set({ status: "loading", error: null, page: 1 });

    try {
      const params: Record<string, string | number> = {
        page: 1,
        limit: 10,
      };

      if (search.trim()) {
        params.q = search.trim();
      }
      if (selectedCategoryId) {
        params.categoryId = selectedCategoryId;
      }
      if (minPrice !== undefined && minPrice > 0) {
        params.minPrice = minPrice;
      }
      if (maxPrice !== undefined && maxPrice > 0) {
        params.maxPrice = maxPrice;
      }

      const response = await apiClient.get<{
        products: Product[];
        pagination: PaginationData;
      }>("/api/products", { params });

      const products = response.data.products || [];
      const pagination = response.data.pagination;

      set({
        products,
        hasMore: pagination ? pagination.page < pagination.totalPages : false,
        page: 1,
        status: "success",
        error: null,
      });
    } catch (err: any) {
      set({
        status: "error",
        error: err.response?.data?.error || "Impossible de charger les produits.",
      });
    }
  },

  loadMore: async () => {
    const {
      page,
      hasMore,
      status,
      products,
      search,
      selectedCategoryId,
      minPrice,
      maxPrice,
    } = get();

    if (!hasMore || status === "loading" || status === "loadingMore") return;

    set({ status: "loadingMore" });

    try {
      const nextPage = page + 1;
      const params: Record<string, string | number> = {
        page: nextPage,
        limit: 10,
      };

      if (search.trim()) {
        params.q = search.trim();
      }
      if (selectedCategoryId) {
        params.categoryId = selectedCategoryId;
      }
      if (minPrice !== undefined) {
        params.minPrice = minPrice;
      }
      if (maxPrice !== undefined) {
        params.maxPrice = maxPrice;
      }

      const response = await apiClient.get<{
        products: Product[];
        pagination: PaginationData;
      }>("/api/products", { params });

      const newProducts = response.data.products || [];
      const pagination = response.data.pagination;

      set({
        products: [...products, ...newProducts],
        page: nextPage,
        hasMore: pagination ? pagination.page < pagination.totalPages : false,
        status: "success",
      });
    } catch {
      set({ status: "success" });
    }
  },

  fetchProductDetails: async (id: number): Promise<Product | null> => {
    try {
      const res = await apiClient.get<{ product: Product }>(`/api/products/${id}`);
      return res.data.product || null;
    } catch {
      return null;
    }
  },
}));
