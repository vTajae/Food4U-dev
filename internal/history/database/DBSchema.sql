CREATE TABLE Profile (
    ProfileID INT PRIMARY KEY,
    -- Controlled ProfileID supplied externally    Age INT,
    Ethnicity VARCHAR(100),
    Location VARCHAR(255),
    -- Regional-based meal suggestions
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE DietType (
    DietID SERIAL PRIMARY KEY,
    DietName VARCHAR(100) NOT NULL UNIQUE,
    Description TEXT
);

CREATE TABLE Intolerance (
    IntoleranceID SERIAL PRIMARY KEY,
    IntoleranceName VARCHAR(100) NOT NULL UNIQUE,
    Description TEXT
);


CREATE TABLE ICDCodes (
    ICDCode VARCHAR(10) PRIMARY KEY,
    Description VARCHAR(255)
);

CREATE TABLE PatientMedicalHistory (
    MedicalHistoryID SERIAL PRIMARY KEY,
    ProfileID INT NOT NULL,
    ICDCode VARCHAR(10) NOT NULL,
    DateDiagnosed DATE,
    Notes TEXT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (ICDCode) REFERENCES ICDCodes(ICDCode) ON DELETE RESTRICT
);


CREATE TABLE ProfileAttribute (
    AttributeID SERIAL PRIMARY KEY,
    ProfileID INT NOT NULL,
    AttributeCategory VARCHAR(50),
    -- e.g., "Allergy", "Diet", "Other"
    AttributeName VARCHAR(100),
    -- e.g., "Peanuts", "Vegan"
    AttributeValue VARCHAR(255),
    Notes TEXT,
    -- e.g., "Severe", "180cm"
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE
);


CREATE TABLE Meal (
    MealID SERIAL PRIMARY KEY,
    MealName VARCHAR(255),
    Description TEXT,
    Calories INT,
    CuisineID VARCHAR(100),
    -- e.g., "Italian", "Mexican"
    MealTimeID INT,
    -- e.g., "Breakfast", "Dinner"
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (MealTimeID) REFERENCES MealTime(MealTimeID) ON DELETE 
    FOREIGN KEY (CuisineID) REFERENCES CuisineType(CuisineID) ON DELETE CASCADE

);

CREATE TABLE MealTime (
    MealTimeID SERIAL PRIMARY KEY,
    MealTimeName VARCHAR(50),
    -- e.g., "Breakfast", "Lunch"
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE MealComponent (
    MealComponentID SERIAL PRIMARY KEY,
    MealID INT,
    ComponentName VARCHAR(100),
    -- e.g., "Chicken", "Rice"
    PortionSize NUMERIC(5, 2),
    -- Portion size in grams
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE
);


