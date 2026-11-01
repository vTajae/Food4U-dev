<!-- Imported from the pre-repo notes folder (api_documentation.md); original hackathon-era material, kept verbatim except for redacted keys. -->


# FoodData Central API Docs

## API Endpoints

| URL                  | Verb       | Purpose                                                        |
|----------------------|------------|----------------------------------------------------------------|
| `/food/{fdcId}`       | `GET`      | Fetches details for one food item by FDC ID.                   |
| `/foods`             | `GET | POST` | Fetches details for multiple food items using input FDC IDs.    |
| `/foods/list`        | `GET | POST` | Returns a paged list of foods, in the 'abridged' format.        |
| `/foods/search`      | `GET | POST` | Returns a list of foods that matched search (query) keywords.   |

## Sample Calls

### Note:
These calls use `DEMO_KEY` for the API key. The `DEMO_KEY` can be used to explore the API initially but has lower rate limits. See [here](#) for more information on uses and limitations of `DEMO_KEY`.

### GET Request

1. **Fetch Food Item by FDC ID:**
   
   ```
   curl https://api.nal.usda.gov/fdc/v1/food/######?api_key=DEMO_KEY
   ```

   Replace `######` with a valid FoodData Central ID.

2. **Fetch List of Foods (Abridged):**

   ```
   curl https://api.nal.usda.gov/fdc/v1/foods/list?api_key=DEMO_KEY
   ```

3. **Search for Foods by Query:**

   ```
   curl https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=Cheddar%20Cheese
   ```

### POST Request

1. **Fetch Paged List of Foods:**

   ```
   curl -XPOST -H "Content-Type:application/json" -d '{"pageSize":25}' https://api.nal.usda.gov/fdc/v1/foods/list?api_key=DEMO_KEY
   ```

2. **Search for Foods with Query:**

   ```
   curl -XPOST -H "Content-Type:application/json" -d '{"query":"Cheddar cheese"}' https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY
   ```

3. **Search for Foods with Query (Windows Example):**

   ```
   curl -XPOST -H "Content-Type:application/json" -d "{"query":"Cheddar cheese"}" https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY
   ```

   > **Note:** On Windows, the body of the POST request (specified using the `-d` option) should be enclosed in double quotes.

4. **Advanced Search for Branded Foods:**

   ```
   curl -XPOST -H "Content-Type:application/json" -d '{"query": "Cheddar cheese", "dataType": ["Branded"], "sortBy": "fdcId", "sortOrder": "desc"}' https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY
   ```

   > **Note:** The `dataType` parameter must be specified as an array.
