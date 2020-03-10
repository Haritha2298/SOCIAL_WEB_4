const assert = require('assert').strict;

const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const movies = require('./data/movie-links.json');

const requestBase = {
    imdb: "https://www.imdb.com/title/tt0",
    movielens: "https://movielens.org/movies/",
    theMovieDB: "https://www.themoviedb.org/movie/"
};

const scrapeImdb = async (movie) => {
    const { imdbId } = movie;
    
    if (!imdbId) return null;
    const requestUrl = requestBase.imdb + imdbId;

    let result = null;

    console.log(`Requesting: ${requestUrl}`);
    try {
        const html = await axios.get(requestUrl)
        const $ = await cheerio.load(html.data);

        result = {
            imdbTitle: null,
            imdbYear: null,
            imdbRating: null,
            metaCriticRating: null
        };
        
        // parse IMDB info
        const titleEl = $('.title_wrapper > h1');
        if (titleEl.length) {
            result.imdbTitle = titleEl.contents()[0].nodeValue.trim();
        }

        const ratingEl = $('.ratingValue span[itemprop="ratingValue"]');
        if (ratingEl.length) {
            // parse the information as a float (replace comma with dot to parse)
            result.imdbRating = parseFloat(ratingEl.text().trim().replace(',', '.'));
        }

        const yearEl = $('#titleYear > a');
        if (yearEl.length) {
            // replaces brackets from year notation
            result.imdbYear = parseInt(yearEl.text().trim().replace(/[\(\)]/g, ''));
        }

        const metaCriticEl = $('.metacriticScore > span');
        if (metaCriticEl.length) {
            result.metaCriticRating = parseInt(metaCriticEl.text().trim());
        }


    } catch (err) {
        console.error(`An error occured while fecthing ${requestUrl}`);
        console.error(`Statuscode: ${err.response && err.response.status}`)
    }

    return result;
}

const scrapeMovieDB = async (movie) => {
    const { tmdbId } = movie;

    if (!tmdbId) return null;
    const requestUrl = requestBase.theMovieDB + tmdbId;

    let result = null;

    console.log(`Requesting: ${requestUrl}`);

    try {
        const html = await axios.get(requestUrl)
        const $ = await cheerio.load(html.data);

        result = {
            tmdbTitle: null,
            tmdbRating: null,
            tmdbYear: null
        };
        
        // parse TMDB info
        const titleEl = $('.title h2');
        if (titleEl.length) {
            result.tmdbTitle = titleEl.text().trim();
        }

        const ratingEl = $('.user_score_chart');
        if (ratingEl.length) {
            result.tmdbRating = parseInt(ratingEl.data().percent);
        }

        const yearEl = $('span.release_date');
        if (yearEl.length) {
            // remove brackets from year
            result.tmdbYear = parseInt(yearEl.text().trim().replace(/[\(\)]/g, ''));
        }

    } catch (err) {
        console.error(`An error occured while fecthing ${requestUrl}`);
        console.error(`Statuscode: ${err.response && err.response.status}`)
    }

    return result;
}

const addMovieProperties = (movie, scrapedData) => {
    for (let property in scrapedData) {
        movie[property] = scrapedData[property];
    }
}

const createCSV = (movies, start, end) => {
    const suffix = start === 0 && end === movies.length 
        ? 'full'
        : `${start}-${end}`
    const outputPath = `${__dirname}/data/scraped_${suffix}.csv`

    const csvWriter = createCsvWriter({
        path: outputPath,
        header: [
            {id: 'movieId', title: 'movieId'},
            {id: 'title', title: 'title'},
            {id: 'imdbTitle', title: 'imdbTitle'},
            {id: 'tmdbTitle', title: 'tmdbTitle'},
            {id: 'imdbYear', title: 'imdbYear'},
            {id: 'tmdbYear', title: 'tmdbYear'},
            {id: 'genres', title: 'genres'},
            {id: 'imdbRating', title: 'imdbRating'},
            {id: 'tmdbRating', title: 'tmdbRating'},
            {id: 'metaCriticRating', title: 'metaCriticRating'},
        ]
    });

    csvWriter.writeRecords(movies)
        .then(() => console.log(`Created CSV containing scraped data at ${outputPath}`))
        .catch(err => console.error(err))
}

const main = async () => {

    const start = process.argv[2] || 0;
    const end = process.argv[3] || movies.length;

    assert(end > start);

    console.log('Scraping IMDB and TheMovieDB');
    console.log(`Scraping ${end - start} movies, starting at ${start}...`);

    for (let i = start; i < end && i < movies.length ; i++) {
        const movie = movies[i];
        movie.movieId = i + 1;

        console.log(`Processing movie id: ${movie.movieId} - ${movie.title}`);

        const imdbResults = await scrapeImdb(movie);
        const tmdbResults = await scrapeMovieDB(movie);

        if (imdbResults) {
            addMovieProperties(movie, imdbResults);
        }

        if (tmdbResults) {
            addMovieProperties(movie, tmdbResults);
        }

    }

    console.log(movies.slice(start, end));
    createCSV(movies.slice(start, end), start, end);

}

main();
