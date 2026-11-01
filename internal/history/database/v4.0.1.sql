CREATE TABLE Profile (
    ProfileID INT PRIMARY KEY,
    -- Controlled ProfileID supplied externally    Age INT,
    Ethnicity VARCHAR(100),
    Location VARCHAR(255),
    -- Regional-based meal suggestions
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ProfileVitals (
    ProfileID INT PRIMARY KEY,
    Height NUMERIC(5, 2),
    Weight NUMERIC(5, 2),
    BloodPressure VARCHAR(20),
    BMI NUMERIC(4, 2),
    BloodOxygen NUMERIC(4, 2),
    CaloriesTarget INT,
    WeightGoal NUMERIC(5, 2),
    CaloriesConsumed INT,
    GoalStartDate DATE,
    GoalEndDate DATE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE
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

CREATE TABLE DietType (
    DietTypeID SERIAL PRIMARY KEY,
    DietName VARCHAR(100) UNIQUE,
    -- e.g., "Vegan", "Vegetarian"
    Description VARCHAR(255),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ProfileDiet (
    ProfileID INT,
    DietTypeID INT,
    PRIMARY KEY (ProfileID, DietTypeID),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID) ON DELETE CASCADE
);

CREATE TABLE Allergen (
    AllergenID SERIAL PRIMARY KEY,
    AllergenName VARCHAR(255),
    -- e.g., "Ara h 1"
    CommonName VARCHAR(255),
    -- e.g., "Peanut"
    Allergenicity VARCHAR(50),
    -- e.g., "High"
    Source VARCHAR(255),
    -- e.g., "Peanut"
    ProteinSequence TEXT,
    -- Longer sequences may require TEXT
    AccessionNumber VARCHAR(50),
    -- Reference number
    Species VARCHAR(255) -- e.g., "Arachis hypogaea"
);

CREATE TABLE MealComponentAllergen (
    MealComponentID INT,
    AllergenID INT,
    PRIMARY KEY (MealComponentID, AllergenID),
    FOREIGN KEY (MealComponentID) REFERENCES MealComponent(MealComponentID) ON DELETE CASCADE,
    FOREIGN KEY (AllergenID) REFERENCES Allergen(AllergenID) ON DELETE CASCADE
);

CREATE TABLE Intolerance (
    IntoleranceID SERIAL PRIMARY KEY,
    IntoleranceName VARCHAR(100),
    -- e.g., "Lactose"
    Description VARCHAR(255),
    -- e.g., "Lactose intolerance"
    Source VARCHAR(255) -- e.g., "Milk"
);

CREATE TABLE MealComponentIntolerance (
    MealComponentID INT,
    IntoleranceID INT,
    PRIMARY KEY (MealComponentID, IntoleranceID),
    FOREIGN KEY (MealComponentID) REFERENCES MealComponent(MealComponentID) ON DELETE CASCADE,
    FOREIGN KEY (IntoleranceID) REFERENCES Intolerance(IntoleranceID) ON DELETE CASCADE
);

CREATE TABLE Meal (
    MealID SERIAL PRIMARY KEY,
    MealName VARCHAR(255),
    Description TEXT,
    Calories INT,
    Cuisine VARCHAR(100),
    -- e.g., "Italian", "Mexican"
    MealTypeID INT,
    -- e.g., "Breakfast", "Dinner"
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (MealTypeID) REFERENCES MealType(MealTypeID) ON DELETE CASCADE
);

CREATE TABLE MealType (
    MealTypeID SERIAL PRIMARY KEY,
    MealTypeName VARCHAR(50),
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

CREATE TABLE MealDietType (
    MealID INT,
    DietTypeID INT,
    PRIMARY KEY (MealID, DietTypeID),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE,
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID) ON DELETE CASCADE
);

CREATE TABLE MealComponentDietType (
    MealComponentID INT,
    DietTypeID INT,
    PRIMARY KEY (MealComponentID, DietTypeID),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (MealComponentID) REFERENCES MealComponent(MealComponentID) ON DELETE CASCADE,
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID) ON DELETE CASCADE
);

CREATE TABLE ProfileMealPreferences (
    ProfileID INT,
    MealID INT,
    BodyPreference VARCHAR(10) CHECK (BodyPreference IN ('Like', 'Dislike', 'Neutral')),
    TastePreference VARCHAR(10) CHECK (
        TastePreference IN ('Like', 'Dislike', 'Neutral')
    ),
    PRIMARY KEY (ProfileID, MealID),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE
);

CREATE TABLE ProfilePreference (
    PreferenceID SERIAL PRIMARY KEY,
    ProfileID INT,
    MealTypeID INT,
    Cuisine VARCHAR(100),
    -- e.g., "Italian", "Mexican"
    SpiceLevel INT DEFAULT 0 CHECK (
        SpiceLevel BETWEEN 0
        AND 5
    ),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (MealTypeID) REFERENCES MealType(MealTypeID) ON DELETE CASCADE
);

CREATE TABLE MealReview (
    ReviewID SERIAL PRIMARY KEY,
    ProfileID INT,
    MealID INT,
    Rating INT CHECK (
        Rating BETWEEN 1
        AND 5
    ),
    ReviewText TEXT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE
);

CREATE TABLE ProfileGoal (
    GoalID SERIAL PRIMARY KEY,
    ProfileID INT,
    GoalType VARCHAR(50),
    -- e.g., "Gain Weight"
    TargetWeight NUMERIC(5, 2),
    -- in kg
    TargetCalories INT,
    -- Daily caloric intake
    StartDate DATE,
    EndDate DATE,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE
);

CREATE TABLE ProfileProgress (
    ProgressID SERIAL PRIMARY KEY,
    ProfileID INT,
    DateLogged DATE,
    Weight NUMERIC(5, 2),
    CaloriesConsumed INT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE
);

CREATE TABLE ExternalMealAPI (
    APIID SERIAL PRIMARY KEY,
    APIName VARCHAR(255),
    APIKey VARCHAR(255),
    BaseURL VARCHAR(255),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ExternalMeal (
    ExternalMealID SERIAL PRIMARY KEY,
    APIID INT,
    ExternalMealName VARCHAR(255),
    Description TEXT,
    Calories INT,
    Cuisine VARCHAR(100),
    MealTypeID INT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (APIID) REFERENCES ExternalMealAPI(APIID) ON DELETE CASCADE,
    FOREIGN KEY (MealTypeID) REFERENCES MealType(MealTypeID) ON DELETE CASCADE
);

CREATE TABLE ProfileExternalMealPreferences (
    ProfileID INT,
    ExternalMealID INT,
    BodyPreference VARCHAR(10) CHECK (BodyPreference IN ('Like', 'Dislike', 'Neutral')),
    TastePreference VARCHAR(10) CHECK (
        TastePreference IN ('Like', 'Dislike', 'Neutral')
    ),
    PRIMARY KEY (ProfileID, ExternalMealID),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP UpdatedBy VARCHAR(255),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (ExternalMealID) REFERENCES ExternalMeal(ExternalMealID) ON DELETE CASCADE
);

CREATE TABLE ProfileAllergy (
    ProfileID INT,
    AllergenID INT,
    PRIMARY KEY (ProfileID, AllergenID),
    Notes TEXT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (AllergenID) REFERENCES Allergen(AllergenID) ON DELETE CASCADE
);

CREATE TABLE ProfileIntolerance (
    ProfileID INT,
    IntoleranceID INT,
    PRIMARY KEY (ProfileID, IntoleranceID),
    Notes TEXT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (IntoleranceID) REFERENCES Intolerance(IntoleranceID) ON DELETE CASCADE
);