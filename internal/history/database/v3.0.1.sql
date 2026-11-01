-- Profile Table (Basic profile information)
CREATE TABLE Profile (
    ProfileID UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Use UUID as the primary key
    Age INT,
    Ethnicity VARCHAR(30)  -- Adjusted size to match the model
);

-- Profile Vitals Table (Separate table for detailed health information)
CREATE TABLE ProfileVitals (
    ProfileID UUID PRIMARY KEY,
    Height DECIMAL(5,2),
    Weight DECIMAL(5,2),
    BloodPressure VARCHAR(20),
    BMI DECIMAL(4,2),
    BloodOxygen DECIMAL(4,2),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE
);

-- ICD Codes Table (Medical condition codes as per standardized ICD system)
CREATE TABLE ICDCodes (
    ICDCode VARCHAR(10) PRIMARY KEY,
    Description VARCHAR(255)
);

-- Patient Medical History Table (Links profile with ICD codes for medical history)
CREATE TABLE PatientMedicalHistory (
    MedicalHistoryID SERIAL PRIMARY KEY,  -- Use SERIAL for auto-increment
    ProfileID UUID,
    ICDCode VARCHAR(10),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (ICDCode) REFERENCES ICDCodes(ICDCode) ON DELETE RESTRICT
);

-- Profile Attributes Table (General attributes, including dietary and medical)
CREATE TABLE ProfileAttribute (
    AttributeID SERIAL PRIMARY KEY,  -- Use SERIAL for auto-increment
    ProfileID UUID,
    AttributeCategory VARCHAR(50),  -- e.g., "Allergy", "Condition", "Diet", "Other"
    AttributeName VARCHAR(100),  -- Example: "Peanuts", "Vegan", "Diabetes"
    AttributeValue VARCHAR(255), -- Example: "Allergy", "180cm", etc.
    IsAllergy BOOLEAN DEFAULT FALSE,
    IsMedicalCondition BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE
);

-- Diet Type Table (Standard diet types)
CREATE TABLE DietType (
    DietTypeID SERIAL PRIMARY KEY,  -- Use SERIAL for auto-increment
    DietName VARCHAR(100) UNIQUE, -- e.g., "Vegan", "Vegetarian"
    Description VARCHAR(255)
);

-- Profile Diet Table (Links profiles with diet types)
CREATE TABLE ProfileDiet (
    ProfileID UUID,
    DietTypeID INT,
    PRIMARY KEY (ProfileID, DietTypeID),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID) ON DELETE CASCADE
);

-- Meal Table (Contains meal information and allergens)
CREATE TABLE Meal (
    MealID SERIAL PRIMARY KEY,  -- Use SERIAL for auto-increment
    Description VARCHAR(255),
    Calories INT,
    Allergens VARCHAR(255)  -- e.g., "Milk, Nuts"
);

-- Meal Type Table (For categorizing meals into types like Breakfast, Lunch, etc.)
CREATE TABLE MealType (
    MealTypeID SERIAL PRIMARY KEY,  -- Use SERIAL for auto-increment
    MealTypeName VARCHAR(50)  -- e.g., "Breakfast", "Lunch"
);

-- Meal Component Table (Stores meal components like ingredients)
CREATE TABLE MealComponent (
    MealComponentID SERIAL PRIMARY KEY,  -- Use SERIAL for auto-increment
    MealID INT,
    ComponentName VARCHAR(100),   -- e.g., "Chicken", "Rice", etc.
    PortionSize DECIMAL(5,2),     -- Portion size in grams
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE
);

-- Meal Diet Type Table (Links meals with applicable diet types)
CREATE TABLE MealDietType (
    MealID INT,
    DietTypeID INT,
    PRIMARY KEY (MealID, DietTypeID),
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE,
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID) ON DELETE CASCADE
);

-- Meal Component Diet Type Table (Links components to diet types)
CREATE TABLE MealComponentDietType (
    MealComponentID INT,
    DietTypeID INT,
    PRIMARY KEY (MealComponentID, DietTypeID),
    FOREIGN KEY (MealComponentID) REFERENCES MealComponent(MealComponentID) ON DELETE CASCADE,
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID) ON DELETE CASCADE
);

-- Profile Meal Preferences Table (User likes/dislikes meals)
CREATE TABLE ProfileMealPreferences (
    ProfileID UUID,
    MealID INT,
    Liked BOOLEAN DEFAULT FALSE,
    Disliked BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (ProfileID, MealID),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE
);

-- Profile Preferences Table (For cuisine and meal type preferences)
CREATE TABLE ProfilePreference (
    PreferenceID SERIAL PRIMARY KEY,  -- Use SERIAL for auto-increment
    ProfileID UUID,
    MealTypeID INT,
    Cuisine VARCHAR(100), -- e.g., "Italian", "Mexican"
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (MealTypeID) REFERENCES MealType(MealTypeID) ON DELETE CASCADE
);

-- Rate Limit Table for tracking API usage limits
CREATE TABLE RateLimits (
    RateLimitID SERIAL PRIMARY KEY,
    Identifier VARCHAR(255) NOT NULL, -- Could be IP or user ID
    RequestCount INT DEFAULT 0,
    LastRequest TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token Table for user sessions or authentication
CREATE TABLE Tokens (
    TokenID SERIAL PRIMARY KEY,
    Token VARCHAR(255) UNIQUE NOT NULL,
    UserID UUID NOT NULL,
    ExpiryDate TIMESTAMP NOT NULL,
    IsActive BOOLEAN DEFAULT TRUE,
    TokenType TokenTypeEnum NOT NULL -- TokenTypeEnum should be a custom ENUM type
);
