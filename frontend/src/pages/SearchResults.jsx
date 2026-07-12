import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import ListingCard from '../components/ListingCard.jsx';

export default function SearchResults() {
  const [params] = useSearchParams();
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setResults(null);
    setError(null);
    const query = Object.fromEntries(params.entries());
    api.search(query).then((data) => setResults(data.results)).catch((err) => setError(err.message));
  }, [params]);

  return (
    <div className="pb-20">
      <div className="mb-8 text-center">
        <h2 className="font-display text-4xl font-bold text-slate-800">
          {params.get('type')?.toUpperCase()} Results
        </h2>
        <p className="text-slate-500 mt-2">Find your perfect match</p>
      </div>

      {error && <p className="text-red-500 text-center text-lg">{error}</p>}
      {!results && !error && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 text-lg">Searching...</p>
        </div>
      )}
      {results && results.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-slate-500 text-lg">No results found for this search. Try different dates or a nearby city.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
        {results?.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
      </div>
    </div>
  );
}
