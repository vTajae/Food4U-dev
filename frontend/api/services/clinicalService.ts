interface Icd10Result {
  code: string;
  name: string;
}

interface Icd10Response {
  icd10cm: Icd10Result[];
}

interface AutocompleteResult {
  code: string;
  name: string;
}

// NLM Clinical Tables v3 search response: [total, codes, extra fields, display rows].
type ClinicalTablesResponse = [number, string[], { icd10cm?: Icd10Result[][] } | null, string[][]];

export class ClinicalService {
  private static readonly BASE_API_URL = "https://clinicaltables.nlm.nih.gov/api/";

  /**
   * Generalized method to call any clinical API route dynamically
   * @param route - The dynamic route part (e.g., 'icd10cm', 'conditions', etc.)
   * @param query - The search term (ICD-10 code, condition name, etc.).
   * @param searchFields - Optional fields to search by.
   * @param displayFields - Optional fields to display in the response.
   * @param maxResults - Maximum number of results to return (default is 50).
   * @param extraFields - Extra query parameters like 'ef'.
   * @returns - The raw response data from the API.
   */
  private static async fetchClinicalData(
    route: "conditions" | "icd10cm",
    query: string,
    searchFields?: string | string[],
    displayFields?: string | string[],
    maxResults: number = 50,
    extraFields?: Record<string, string>
  ): Promise<ClinicalTablesResponse | null> {
    const params = new URLSearchParams({
      terms: query,
      maxList: maxResults.toString(),
    });
  
    // Add any extra fields (like 'ef')
    if (extraFields) {
      Object.entries(extraFields).forEach(([key, value]) => {
        params.append(key, value);
      });
    }
  
    // Build the base API URL
    let apiUrl = `${this.BASE_API_URL}${route}/v3/search?${params.toString()}`;
  
    // Add the 'sf' parameter only if the route is not 'conditions'
    if (searchFields && route !== "conditions") {
      apiUrl += `&sf=${Array.isArray(searchFields) ? searchFields.join(",") : searchFields}`;
    }
  
    if (displayFields) {
      apiUrl += `&df=${Array.isArray(displayFields) ? displayFields.join(",") : displayFields}`;
    }
  
    ////console.log("API URL:", apiUrl);
  
    try {
      const response = await fetch(apiUrl, this.getRequestOptions("GET"));
      if (!response.ok) {
        throw new Error(`Error fetching data from ${route}: ${response.statusText}`);
      }
  
      return (await response.json()) as ClinicalTablesResponse;
    } catch (error) {
      console.error(`Error fetching data from ${route}:`, error);
      return null;
    }
  }
  

  // Utility method for request options
  private static getRequestOptions(method: string) {
    return {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  /**
   * Handles the ICD-10 search response and parses it to return only the ICD-10 data.
   * @param query - The search term (e.g., an ICD-10 code or condition name).
   * @param maxResults - Maximum number of results to return (default is 50).
   * @returns - A promise that resolves to the icd10cm field of the response.
   */
  static async searchIcd10(query: string, maxResults: number = 50): Promise<Icd10Response | null> {
    const data = await this.fetchClinicalData("icd10cm", query, undefined, undefined, maxResults);

    if (!data || !data[3]) {
      return null;
    }

    // Map the array of ICD-10 codes and descriptions
    const icd10cm: Icd10Result[] = data[3].map((entry: string[]) => ({
      code: entry[0], // The first element is the code
      name: entry[1], // The second element is the description
    }));

    return { icd10cm };
  }

  /**
   * Handles the autocomplete response and parses it into AutocompleteResult objects.
   * @param query - The search term (e.g., part of a condition name or ICD-10 code).
   * @param maxResults - Maximum number of results to return (default is 10).
   * @param route - The route to fetch data from ("conditions" or "icd10cm").
   * @returns - A promise that resolves to the AutocompleteResult data or null.
   */
  static async autocompleter(
    query: string,
    maxResults: number = 10,
    route: "conditions" | "icd10cm"
  ): Promise<AutocompleteResult[] | null> {
    try {
      const extraFields = route === "conditions" ? { ef: "icd10cm" } : undefined;
  
      // Fetch data from either "conditions" or "icd10cm" routes
      const data = await this.fetchClinicalData(route, query, ["name"], undefined, maxResults, extraFields);
  
      if (!data) {
        console.error(`No data found for query: ${query}`);
        return null;
      }
  
      if (route === "conditions") {
        if (!data[2]?.icd10cm) {
          ////console.log(`No icd10cm data found for query: ${query}`);
          return null;
        }
  
        const uniqueResults = new Map<string, AutocompleteResult>();
        data[2].icd10cm.forEach((entry: Icd10Result[]) => {
          const code = entry[0].code;
          const name = entry[0].name;
          if (!uniqueResults.has(code)) {
            uniqueResults.set(code, { code, name });
          }
        });
  
        return Array.from(uniqueResults.values());
      } else if (route === "icd10cm") {
        if (!data[3]) {
          ////console.log(`No icd10cm data found for query: ${query}`);
          return null;
        }
  
        // Map the ICD-10 codes and descriptions
        const icd10cm: AutocompleteResult[] = data[3].map((entry: string[]) => ({
          code: entry[0], // The first element is the code
          name: entry[1], // The second element is the description
        }));
  
        return icd10cm;
      }
  
      return null;
    } catch (error) {
      console.error("Error fetching autocomplete data:", error);
      return null;
    }
  }
  
}
