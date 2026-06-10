import axios, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export async function getPosts() {
  try {
    const res = await axios.get(endpoints.post.list);
    return res.data;
  } catch {
    return { posts: [], totalCount: 0 };
  }
}

// ----------------------------------------------------------------------

export async function getPost(title: string) {
  try {
    const URL = title ? `${endpoints.post.details}?title=${title}` : '';
    const res = await axios.get(URL);
    return res.data;
  } catch {
    return { post: null };
  }
}

// ----------------------------------------------------------------------

export async function getLatestPosts(title: string) {
  try {
    const URL = title ? `${endpoints.post.latest}?title=${title}` : '';
    const res = await axios.get(URL);
    return res.data;
  } catch {
    return { posts: [] };
  }
}
