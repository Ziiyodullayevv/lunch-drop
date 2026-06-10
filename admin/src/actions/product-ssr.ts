import axios, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export async function getProducts() {
  try {
    const res = await axios.get(endpoints.product.list);
    return res.data;
  } catch {
    return { products: [] };
  }
}

// ----------------------------------------------------------------------

export async function getProduct(id: string) {
  try {
    const URL = id ? `${endpoints.product.details}?productId=${id}` : '';
    const res = await axios.get(URL);
    return res.data;
  } catch {
    return { product: null };
  }
}
