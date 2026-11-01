<!-- Imported from the pre-repo notes folder (clinicaltables.nlm.nih.gov); original hackathon-era material, kept verbatim except for redacted keys. -->

API Docs:

*NEEDS TO USE AUTOCOMPLETE FROM LIST OF CONDITIONS*

https://clinicaltables.nlm.nih.gov/api/conditions/v3/search?terms=`${MEDICAL_CONDITION}`



Params:

&maxList=500
&df=primary_name,consumer_name,icd10cm,term_icd9_code,term_icd9_text,synonyms,info_link_data	 (Links and List)
@Returns


[5, [
    "4458",
    "1510",
    "8536",
    "11065",
    "2565"
  ],
  null, [
    [
      "Gastroenteritis",
      "Gastroenteritis",
      "{\"code\":\"K52.9\",\"name\":\"Noninfective gastroenteritis and colitis, unspecified\"}",
      "558.9",
      "Other and unspecified noninfectious gastroenteritis and colitis",
      "",
      "http://www.nlm.nih.gov/medlineplus/gastroenteritis.html,Gastroenteritis"
    ],
    [
      "Salmonella enteritidis",
      "Salmonella enteritidis",
      "{\"code\":\"A01.02\",\"name\":\"Typhoid fever with heart involvement\"}",
      "003.0",
      "Salmonella gastroenteritis",
      "S enteritidis",
      "http://www.nlm.nih.gov/medlineplus/salmonellainfections.html,Salmonella Infections"
    ],
    [
      "Colitis",
      "Colitis",
      "{\"code\":\"K52.9\",\"name\":\"Noninfective gastroenteritis and colitis, unspecified\"}",
      "558.9",
      "Other and unspecified noninfectious gastroenteritis and colitis",
      "colon inflamed",
      "http://www.nlm.nih.gov/medlineplus/ency/article/001125.htm,Colitis"
    ],
    [
      "Inflammatory bowel disease",
      "Inflammatory bowel disease (IBD)",
      "{\"code\":\"K52.9\",\"name\":\"Noninfective gastroenteritis and colitis, unspecified\"}",
      "558.9",
      "Other and unspecified noninfectious gastroenteritis and colitis",
      "IBD",
      "http://www.nlm.nih.gov/medlineplus/ulcerativecolitis.html,Ulcerative Colitis"
    ],
    [
      "Ileitis",
      "Ileitis",
      "{\"code\":\"K52.9\",\"name\":\"Noninfective gastroenteritis and colitis, unspecified\"}",
      "558.9",
      "Other and unspecified noninfectious gastroenteritis and colitis",
      "inflamed ileum",
      "http://www.nlm.nih.gov/medlineplus/crohnsdisease.html,Crohn''s Disease"
    ]
  ]
]



&sf=consumer_name&ef=term_icd9_code,term_icd9_text	(List of Similar Diagnosis)
@Returns

[5,["4458","1510","8536","11065","2565"],null,[["Gastroenteritis"],["Salmonella enteritidis"],["Colitis"],["Inflammatory bowel disease (IBD)"],["Ileitis"]]]





















Database:

Users can have 0 or many medical conditions
A medical condition has 1 and only 1 icd10cm_code

Users can have many likes and dislikes (meals).
Users can have many meal plans, and meal plans can contain many meals.




