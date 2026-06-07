const getGifUrl = async (query, apiKey) => {
    if (!apiKey) return null;

    try {
        const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=1`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data.data && data.data.length > 0) {
            return data.data[0].url; 
        }
        return null;
    } catch (error) {
        return null;
    }
};

module.exports = { getGifUrl };