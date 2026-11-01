-- Profile Table (Basic profile information)
CREATE TABLE Profile (
    ProfileID INT PRIMARY KEY AUTO_INCREMENT,
    Age INT,
    Ethnicity VARCHAR(100),
    Location VARCHAR(255),  -- Location for regional-based meal suggestions
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255)  -- Audit field
);

-- Profile Vitals Table (Detailed health information)
CREATE TABLE ProfileVitals (
    ProfileID INT PRIMARY KEY,
    Height DECIMAL(5,2),
    Weight DECIMAL(5,2),
    BloodPressure VARCHAR(20),
    BMI DECIMAL(4,2),
    BloodOxygen DECIMAL(4,2),
    CaloriesTarget INT,     -- Daily caloric target based on goals
    WeightGoal DECIMAL(5,2), -- Ideal weight based on the goal
    CaloriesConsumed INT,    -- Daily calories consumed
    GoalStartDate DATE,      -- Start date of the current goal
    GoalEndDate DATE,        -- End date of the current goal
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE
);

-- ICD Codes Table (Medical condition codes as per standardized ICD system)
CREATE TABLE ICDCodes (
    ICDCode VARCHAR(10) PRIMARY KEY,
    Description VARCHAR(255)
);

-- Patient Medical History Table (Links profile with ICD codes for medical history)
CREATE TABLE PatientMedicalHistory (
    MedicalHistoryID INT PRIMARY KEY AUTO_INCREMENT,
    ProfileID INT,
    ICDCode VARCHAR(10),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (ICDCode) REFERENCES ICDCodes(ICDCode) ON DELETE RESTRICT
);

-- Profile Attributes Table (General attributes, including dietary, allergies, and medical conditions)
CREATE TABLE ProfileAttribute (
    AttributeID INT PRIMARY KEY AUTO_INCREMENT,
    ProfileID INT,
    AttributeCategory VARCHAR(50),  -- e.g., "Allergy", "Condition", "Diet", "Other"
    AttributeName VARCHAR(100),  -- Example: "Peanuts", "Vegan", "Diabetes"
    AttributeValue VARCHAR(255), -- Example: "Allergy", "180cm", etc.
    IsAllergy BOOLEAN DEFAULT FALSE,   -- Marks the attribute as an allergy
    IsIntolerance BOOLEAN DEFAULT FALSE, -- Marks the attribute as a food intolerance
    IsMedicalCondition BOOLEAN DEFAULT FALSE, -- Marks a medical condition
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE
);

-- Diet Type Table (Standard diet types)
CREATE TABLE DietType (
    DietTypeID INT PRIMARY KEY AUTO_INCREMENT,
    DietName VARCHAR(100) UNIQUE, -- e.g., "Vegan", "Vegetarian"
    Description VARCHAR(255),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255) -- Audit field
);

-- Profile Diet Table (Links profiles with diet types)
CREATE TABLE ProfileDiet (
    ProfileID INT,
    DietTypeID INT,
    PRIMARY KEY (ProfileID, DietTypeID),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID) ON DELETE CASCADE
);

-- Allergen Table (Contains allergens linked to meals and ingredients)
CREATE TABLE Allergen (
    AllergenID INT PRIMARY KEY AUTO_INCREMENT,
    AllergenName VARCHAR(255),        -- e.g., "Ara h 1" (Peanut allergen)
    CommonName VARCHAR(255),          -- Common name (e.g., "Peanut")
    Allergenicity VARCHAR(50),        -- Degree of allergenicity (e.g., IgE-binding)
    Source VARCHAR(255),              -- Source (e.g., food item like "Peanut")
    ProteinSequence VARCHAR(255),     -- Allergen protein sequence (from dataset)
    AccessionNumber VARCHAR(50),      -- Reference number for the allergen (from dataset)
    Species VARCHAR(255),             -- Source species (e.g., "Arachis hypogaea")
    FOREIGN KEY (AllergenID) REFERENCES MealComponent(MealComponentID) ON DELETE CASCADE -- Links to meal ingredients
);

-- Intolerance Table (Stores common intolerances like lactose, gluten, etc.)
CREATE TABLE Intolerance (
    IntoleranceID INT PRIMARY KEY AUTO_INCREMENT,
    IntoleranceName VARCHAR(100),  -- e.g., "Lactose", "Gluten"
    Description VARCHAR(255),      -- Description of intolerance (e.g., "Lactose intolerance")
    Source VARCHAR(255),           -- Source (e.g., "Milk", "Wheat")
    FOREIGN KEY (IntoleranceID) REFERENCES MealComponent(MealComponentID) ON DELETE CASCADE -- Links to meal ingredients
);

-- Meal Table (Contains meal information and allergens)
CREATE TABLE Meal (
    MealID INT PRIMARY KEY AUTO_INCREMENT,
    Description VARCHAR(255),
    Calories INT,
    Allergens VARCHAR(255),  -- e.g., "Milk, Nuts"
    Cuisine VARCHAR(100),    -- Meal's cuisine type (e.g., "Italian", "Mexican")
    MealTypeID INT,          -- Direct link to MealType (e.g., "Breakfast", "Dinner")
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (MealTypeID) REFERENCES MealType(MealTypeID) ON DELETE CASCADE
);

-- Meal Type Table (For categorizing meals into types like Breakfast, Lunch, etc.)
CREATE TABLE MealType (
    MealTypeID INT PRIMARY KEY AUTO_INCREMENT,
    MealTypeName VARCHAR(50),  -- e.g., "Breakfast", "Lunch"
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255) -- Audit field
);

-- Meal Component Table (Stores meal components like ingredients)
CREATE TABLE MealComponent (
    MealComponentID INT PRIMARY KEY AUTO_INCREMENT,
    MealID INT,
    ComponentName VARCHAR(100),   -- e.g., "Chicken", "Rice", etc.
    PortionSize DECIMAL(5,2),     -- Portion size in grams
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE
);

-- Meal Diet Type Table (Links meals with applicable diet types)
CREATE TABLE MealDietType (
    MealID INT,
    DietTypeID INT,
    PRIMARY KEY (MealID, DietTypeID),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE,
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID) ON DELETE CASCADE
);

-- Meal Component Diet Type Table (Links components to diet types)
CREATE TABLE MealComponentDietType (
    MealComponentID INT,
    DietTypeID INT,
    PRIMARY KEY (MealComponentID, DietTypeID),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (MealComponentID) REFERENCES MealComponent(MealComponentID) ON DELETE CASCADE,
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID) ON DELETE CASCADE
);

-- Profile Meal Preferences Table (User likes/dislikes meals - categorized as body/taste likes/dislikes)
CREATE TABLE ProfileMealPreferences (
    ProfileID INT,
    MealID INT,
    BodyLiked BOOLEAN DEFAULT FALSE,   -- User's body reacts positively to this meal (e.g., aligns with medical needs)
    BodyDisliked BOOLEAN DEFAULT FALSE, -- User's body reacts negatively to this meal (e.g., allergens, medical conditions)
    TasteLiked BOOLEAN DEFAULT FALSE,  -- User personally enjoys the taste of this meal
    TasteDisliked BOOLEAN DEFAULT FALSE, -- User personally dislikes the taste of this meal
    PRIMARY KEY (ProfileID, MealID),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE
);

-- Profile Preferences Table (For cuisine and meal type preferences)
CREATE TABLE ProfilePreference (
    PreferenceID INT PRIMARY KEY AUTO_INCREMENT,
    ProfileID INT,
    MealTypeID INT,
    Cuisine VARCHAR(100), -- e.g., "Italian", "Mexican"
    SpiceLevel INT DEFAULT 0, -- Spice level preference (0 = mild, 5 = very spicy)
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (MealTypeID) REFERENCES MealType(MealTypeID) ON DELETE CASCADE
);

-- Meal Reviews Table (Stores user reviews for meals)
CREATE TABLE MealReview (
    ReviewID INT PRIMARY KEY AUTO_INCREMENT,
    ProfileID INT,
    MealID INT,
    Rating INT CHECK (Rating BETWEEN 1 AND 5), -- Rating out of 5
    ReviewText TEXT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (MealID) REFERENCES Meal(MealID) ON DELETE CASCADE
);

-- Profile Goals Table (Tracks user goals like gain, lose, or maintain weight)
CREATE TABLE ProfileGoal (
    GoalID INT PRIMARY KEY AUTO_INCREMENT,
    ProfileID INT,
    GoalType VARCHAR(50),  -- e.g., "Gain Weight", "Lose Weight", "Maintain Weight"
    TargetWeight DECIMAL(5,2),  -- Target weight in kg
    TargetCalories INT,  -- Target daily caloric intake
    StartDate DATE,      -- When the goal starts
    EndDate DATE,        -- When the goal should be achieved
    IsActive BOOLEAN DEFAULT TRUE,  -- To identify the current active goal
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE
);

-- Profile Progress Table (Logs user progress toward their goals over time)
CREATE TABLE ProfileProgress (
    ProgressID INT PRIMARY KEY AUTO_INCREMENT,
    ProfileID INT,
    DateLogged DATE,     -- Date when the progress was logged
    Weight DECIMAL(5,2), -- Weight at this point in time
    CaloriesConsumed INT, -- Calories consumed on that day
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE
);

-- External API Integration Table (For external meal APIs)
CREATE TABLE ExternalMealAPI (
    APIID INT PRIMARY KEY AUTO_INCREMENT,
    APIName VARCHAR(255),
    APIKey VARCHAR(255),
    BaseURL VARCHAR(255),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255) -- Audit field
);

-- External Meals Table (For meals fetched from external APIs)
CREATE TABLE ExternalMeal (
    ExternalMealID INT PRIMARY KEY AUTO_INCREMENT,
    APIID INT,
    ExternalMealName VARCHAR(255),
    Description VARCHAR(255),
    Calories INT,
    Cuisine VARCHAR(100),
    Allergens VARCHAR(255),
    MealTypeID INT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (APIID) REFERENCES ExternalMealAPI(APIID) ON DELETE CASCADE,
    FOREIGN KEY (MealTypeID) REFERENCES MealType(MealTypeID) ON DELETE CASCADE
);

-- Profile External Meal Preferences Table (Linking user preferences to external meals)
CREATE TABLE ProfileExternalMealPreferences (
    ProfileID INT,
    ExternalMealID INT,
    BodyLiked BOOLEAN DEFAULT FALSE,    -- User's body reacts positively to this external meal
    BodyDisliked BOOLEAN DEFAULT FALSE, -- User's body reacts negatively to this external meal
    TasteLiked BOOLEAN DEFAULT FALSE,   -- User enjoys the taste of this external meal
    TasteDisliked BOOLEAN DEFAULT FALSE, -- User dislikes the taste of this external meal
    PRIMARY KEY (ProfileID, ExternalMealID),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Audit field
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Audit field
    CreatedBy VARCHAR(255), -- Audit field
    UpdatedBy VARCHAR(255), -- Audit field
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID) ON DELETE CASCADE,
    FOREIGN KEY (ExternalMealID) REFERENCES ExternalMeal(ExternalMealID) ON DELETE CASCADE
);
