
import { WikiArticle, GeoPoint } from '../types';
import { WIKI_API_ENDPOINT } from '../constants';

export const fetchNearbyArticles = async (coords: GeoPoint, radius: number = 5000): Promise<WikiArticle[]> => {
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${coords.lat}|${coords.lng}`,
    gsradius: radius.toString(),
    gslimit: '50',
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${WIKI_API_ENDPOINT}?${params.toString()}`);
    const data = await response.json();
    if (data.query && data.query.geosearch) {
      return data.query.geosearch;
    }
    return [];
  } catch (error) {
    console.error("Spectral disruption while querying records:", error);
    return [];
  }
};
