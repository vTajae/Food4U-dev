<!-- Imported from the pre-repo notes folder (icd10cm_api_documentation.md); original hackathon-era material, kept verbatim except for redacted keys. -->


# API for ICD-10-CM

ICD-10-CM (International Classification of Diseases, 10th Revision, Clinical Modification) is a medical coding system for classifying diagnoses and reasons for visits in U.S. health care settings. Learn more about ICD-10-CM.

Currently using: ICD-10-CM 2024  
This service is provided "as is" and free of charge. Please see the Frequently Asked Questions page for more details on terms of service, etc.

## API Demo

The following demo shows how this API might be used with an autocompleter we've developed.

For further experimentation with the autocompleter and this API, try the autocompleter demo page.

## API Documentation

**API Base URL:**  
`https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search` (+ query string parameters)

This data set may also be accessed through the FHIR ValueSet $expand operation.

In addition to the base URL, you will need to specify other parameters. See the query string parameters section below for details.

### Query String Parameters and Default Values

At a minimum, when using the above base URL, you will need to specify the "terms" parameter containing a word or partial word to match.

| Parameter Name | Default Value | Description |
|----------------|---------------|-------------|
| **terms**      | _None_        | (Required.) The search string (e.g., just a part of a word) for which to find matches in the list. More than one partial word can be present in "terms", in which case there is an implicit AND between them. |
| **maxList**    | 7             | Optional, with a default of 7. Specifies the number of results requested, up to the upper limit of 500. If present but the value is empty, 500 will be used. Note that this parameter does not support pagination, see "count" and "offset" below for details on pagination support. |
| **count**      | 7             | The number of results to retrieve (page size). The maximum count allowed is 500, see "offset" below on pagination support. |
| **offset**     | 0             | The starting result number (0-based) to retrieve. Use offset and count together for pagination. |
| **q**          | _None_        | An optional, additional query string used to further constrain the results returned by the "terms" field. Unlike the terms field, "q" is not automatically wildcarded, but can include wildcards and can specify field names. See the Elasticsearch query string page for documentation of supported syntax. |
| **df**         | code, name    | A comma-separated list of display fields (from the fields section below) which are intended for the user to see when looking at the results. |
| **sf**         | code          | A comma-separated list of fields to be searched. |
| **cf**         | code          | A field to regard as the "code" for the returned item data. |
| **ef**         | _None_        | A comma-separated list of additional fields to be returned for each retrieved list item. (See the Output format section for how the data for fields is returned.) If you wish the keys in the returned data hash to be something other than the field names, you can specify an alias for the field name by separating it from its field name with a colon, e.g., "ef=field_name1:alias1,field2,field_name3:alias3,etc." Note that not every field specified in the ef parameter needs to have an alias. |

### ICD-10-CM Field Descriptions

| Field | Field Description |
|-------|-------------------|
| **code** | The ICD-10-CM unique disease code containing 3, 4, 5, 6 or 7 digits. |
| **name** | The long description of the diagnosis string(s). |

### Output format

Output for an API query is an array of the following elements:

1. The total number of results on the server, which can be more than the number of results returned. This reported total number of results may also be significantly less than the actual number of results and is limited to 10,000, which may significantly improve the service response time.
2. An array of codes for the returned items. (This is the field specified with the `cf` query parameter above.)
3. A hash of the "extra" data requested via the `ef` query parameter above. The keys on the hash are the fields (or their requested aliases) named in the `ef` parameter, and the value for a field is an array of that field's values in the same order as the returned codes.
4. An array, with one element for each returned code, where each element is an array of the display strings specified with the `df` query parameter.
5. An array, with one element for each returned code, where each element is the "code system" for the returned code. Note that only code-system aware APIs will return this array.

### Sample API Queries

- **Query:**  
  `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=tuberc`

  **Response:**  
  ```
  [71,["A15.0","A15.4","A15.5","A15.6","A15.7","A15.8","A15.9"],null,[
    ["A15.0","Tuberculosis of lung"],
    ["A15.4","Tuberculosis of intrathoracic lymph nodes"],
    ["A15.5","Tuberculosis of larynx, trachea and bronchus"],
    ["A15.6","Tuberculous pleurisy"],
    ["A15.7","Primary respiratory tuberculosis"],
    ["A15.8","Other respiratory tuberculosis"],
    ["A15.9","Respiratory tuberculosis unspecified"]
  ]]
  ```

- **Query:**  
  `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=A15`

  **Response:**  
  ```
  [7,["A15.0","A15.4","A15.5","A15.6","A15.7","A15.8","A15.9"],null,[
    ["A15.0","Tuberculosis of lung"],
    ["A15.4","Tuberculosis of intrathoracic lymph nodes"],
    ["A15.5","Tuberculosis of larynx, trachea and bronchus"],
    ["A15.6","Tuberculous pleurisy"],
    ["A15.7","Primary respiratory tuberculosis"],
    ["A15.8","Other respiratory tuberculosis"],
    ["A15.9","Respiratory tuberculosis unspecified"]
  ]]
  ```
