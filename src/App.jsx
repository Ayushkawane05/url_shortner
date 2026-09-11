
import { useState, useEffect } from 'react';
import { createShortUrl, getAllUrls } from './api';
import './App.css';

function App() {
    const [originalUrl, setOriginalUrl] = useState('');
    const [customShortUrl, setCustomShortUrl] = useState('');
    const [shortUrl, setShortUrl] = useState('');
    const [urls, setUrls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadUrls = async () => {
        try {
            const data = await getAllUrls();
            setUrls(data);
        } catch (error) {
            console.error('Failed to load URLs:', error);
            setError('Failed to load URLs');
        }
    };

    useEffect(() => {
        loadUrls();
    }, []);

const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedUrl = originalUrl.trim();
    const trimmedShortUrl = customShortUrl.trim();

    if (!trimmedUrl) {
        setError('Please enter a URL');
        return;
    }

    try {
        setLoading(true);
        setError('');
        setShortUrl('');

        const data = await createShortUrl(
            trimmedUrl,
            trimmedShortUrl
        );

        setShortUrl(data.shortUrl);
        setOriginalUrl('');
        setCustomShortUrl('');

        await loadUrls();

    } catch (error) {
        console.error('Failed to create short URL:', error);

        setError(
            error.response?.data?.error ||
            error.message ||
            'Failed to create short URL'
        );
    } finally {
        setLoading(false);
    }
};



    const copyShortUrl = async () => {
        if (!shortUrl) return;

        try {
            await navigator.clipboard.writeText(shortUrl);
            alert('Short URL copied!');
        } catch (error) {
            console.error('Failed to copy URL:', error);
        }
    };

    return (
        <div className="app">
            <div className="container">

                <h1>URL Shortener</h1>

                <p className="subtitle">
                    Create short and shareable URLs
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="url"
                        placeholder="Enter your original URL"
                        value={originalUrl}
                        onChange={(e) => setOriginalUrl(e.target.value)}
                        disabled={loading}
                    />

                    <input
                        type="text"
                        placeholder="Enter your custom short URL (optional)"
                        value={customShortUrl}
                        onChange={(e) => setCustomShortUrl(e.target.value)}
                        disabled={loading}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Shorten URL'}
                    </button>
                </form>

                {error && (
                    <p className="error">
                        {error}
                    </p>
                )}

                {shortUrl && (
                    <div className="result">
                        <p>Your shortened URL:</p>

                        <a
                            href={shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {shortUrl}
                        </a>

                        <button onClick={copyShortUrl}>
                            Copy
                        </button>
                    </div>
                )}

                <div className="history">
                    <div className="history-header">
                        <h2>URL History</h2>

                        <button
                            onClick={loadUrls}
                            disabled={loading}
                        >
                            Refresh
                        </button>
                    </div>

                    {urls.length === 0 ? (
                        <p>No URLs created yet.</p>
                    ) : (
                        <div className="url-list">
                            {urls.map((url) => (
                                <div
                                    className="url-card"
                                    key={url._id}
                                >
                                    <p>
                                        <strong>Original:</strong>{' '}
                                        {url.originalUrl}
                                    </p>

                                    <p>
                                        <strong>Short:</strong>{' '}

                                        <a
                                            href={url.shortUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {url.shortUrl}
                                        </a>
                                    </p>

                                    <p>
                                        <strong>Clicks:</strong>{' '}
                                        {url.counter ?? 0}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default App;
