import os
import csv
import pandas as pd

def main():
    dirname = os.path.dirname(__file__)                         # path of script
    movies_path = os.path.join(dirname, 'data/movies.csv')      # path of movies.csv
    links_path = os.path.join(dirname, 'data/links.csv')        # path of links.csv 

    # output path in csv / record based json
    result_path = os.path.join(dirname, 'data/movie-links.csv')
    result_path_json = os.path.join(dirname, 'data/movie-links.json')


    movies_df = pd.read_csv(movies_path) 
    links_df = pd.read_csv(links_path)

    # normalize the data of the links dataset
    links_df = links_df.fillna(0)
    links_df['imdbId'] = pd.to_numeric(links_df['imdbId'])
    links_df['tmdbId'] = links_df['tmdbId'].astype('int')


    combined_df = movies_df.set_index('movieId').join(links_df.set_index('movieId'))

    # output the results to the data directory
    combined_df.to_csv(result_path)
    combined_df.to_json(result_path_json, orient="records")



if __name__ == '__main__':
    main()