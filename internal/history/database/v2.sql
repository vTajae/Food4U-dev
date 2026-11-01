
-- Profile Table
CREATE TABLE Profile (
    ProfileID INT PRIMARY KEY AUTO_INCREMENT,
    Age INT,
    Ethnicity VARCHAR(100)
);

-- Profile Attributes Table
CREATE TABLE ProfileAttribute (
    AttributeID INT PRIMARY KEY AUTO_INCREMENT,
    ProfileID INT,
    AttributeName VARCHAR(100),  -- Example: "Allergy", "MedicalCondition", "Height"
    AttributeValue VARCHAR(255), -- Example: "Peanuts", "Diabetes", "180cm"
    IsAnAllergy BOOLEAN DEFAULT FALSE,
    IsMedicalCondition BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID)
);

-- Profile Vitals Table
CREATE TABLE ProfileVitals (
    ProfileID INT PRIMARY KEY,
    Height DECIMAL(5,2),
    Weight DECIMAL(5,2),
    BloodPressure VARCHAR(20),
    BMI DECIMAL(4,2),
    BloodOxygen DECIMAL(4,2),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID)
);

-- Meal Table
CREATE TABLE Meal (
    MenuItemID INT PRIMARY KEY AUTO_INCREMENT,
    ItemDescription VARCHAR(255),
    Calories INT,
    Allergens VARCHAR(255)  -- e.g., "Milk, Nuts"
);

-- Profile Meals Table
CREATE TABLE ProfileMeals (
    ProfileID INT,
    MenuItemID INT,
    Liked BOOLEAN,
    Disliked BOOLEAN,
    PRIMARY KEY (ProfileID, MenuItemID),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID),
    FOREIGN KEY (MenuItemID) REFERENCES Meal(MenuItemID)
);

-- Menu Table
CREATE TABLE Menu (
    MealID INT PRIMARY KEY AUTO_INCREMENT,
    MenuItemID INT,
    FOREIGN KEY (MenuItemID) REFERENCES Meal(MenuItemID)
);

-- Preference Table
CREATE TABLE Preference (
    PreferenceID INT PRIMARY KEY AUTO_INCREMENT,
    ProfileID INT,
    MealTypeID INT,
    Cuisine VARCHAR(100), -- Example: "Italian", "Mexican"
    Type VARCHAR(50),     -- Example: "Breakfast", "Lunch", "Dinner"
    FOREIGN KEY (MealTypeID) REFERENCES MealType(MealTypeID),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID)
);

-- Meal Type Table
CREATE TABLE MealType (
    MealTypeID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(50)  -- Example: "Breakfast", "Lunch", "Dinner"
);

-- ICD Codes Table
CREATE TABLE ICDCodes (
    Code VARCHAR(10) PRIMARY KEY,
    Description VARCHAR(255)
);

-- Patient Medical History Table
CREATE TABLE PatientMedicalHistory (
    MedicalHistoryID INT PRIMARY KEY AUTO_INCREMENT,
    ProfileID INT,
    Code VARCHAR(10),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID),
    FOREIGN KEY (Code) REFERENCES ICDCodes(Code)
);