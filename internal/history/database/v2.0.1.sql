-- Profile Table
CREATE TABLE Profile (
    ProfileID INT PRIMARY KEY AUTO_INCREMENT,
    Age INT,
    Ethnicity VARCHAR(100)
);

-- Diet Type Table
CREATE TABLE DietType (
    DietTypeID INT PRIMARY KEY AUTO_INCREMENT,
    DietName VARCHAR(100) UNIQUE,  -- e.g., "Vegan", "Vegetarian", "Gluten-Free", "Paleo"
    Description VARCHAR(255)       -- Optional description for the diet type
);

-- Profile Diet Table (Links profiles to the diets they follow)
CREATE TABLE ProfileDiet (
    ProfileID INT,
    DietTypeID INT,
    PRIMARY KEY (ProfileID, DietTypeID),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID),
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID)
);

-- Meal Table (Meals with general info like calories)
CREATE TABLE Meal (
    MealID INT PRIMARY KEY AUTO_INCREMENT,
    ItemDescription VARCHAR(255),
    Calories INT
);

-- Meal Diet Type Table (Associates meals with applicable diets)
CREATE TABLE MealDietType (
    MealID INT,
    DietTypeID INT,
    PRIMARY KEY (MealID, DietTypeID),
    FOREIGN KEY (MealID) REFERENCES Meal(MealID),
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID)
);

-- Meal Component Table (Represents components of a meal, such as proteins or sides)
CREATE TABLE MealComponent (
    MealComponentID INT PRIMARY KEY AUTO_INCREMENT,
    MealID INT,
    ComponentName VARCHAR(100),    -- e.g., "Chicken", "Rice", "Broccoli"
    PortionSize DECIMAL(5,2),      -- Size of the component in grams
    FOREIGN KEY (MealID) REFERENCES Meal(MealID)
);

-- Meal Component Diet Type Table (Associates components with diets)
CREATE TABLE MealComponentDietType (
    MealComponentID INT,
    DietTypeID INT,
    PRIMARY KEY (MealComponentID, DietTypeID),
    FOREIGN KEY (MealComponentID) REFERENCES MealComponent(MealComponentID),
    FOREIGN KEY (DietTypeID) REFERENCES DietType(DietTypeID)
);

-- Profile Meals Table (User likes/dislikes specific meals)
CREATE TABLE ProfileMeals (
    ProfileID INT,
    MealID INT,
    Liked BOOLEAN DEFAULT FALSE,
    Disliked BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (ProfileID, MealID),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID),
    FOREIGN KEY (MealID) REFERENCES Meal(MealID)
);

-- Preference Table (User-specific meal preferences)
CREATE TABLE Preference (
    PreferenceID INT PRIMARY KEY AUTO_INCREMENT,
    ProfileID INT,
    MealTypeID INT,
    Cuisine VARCHAR(100),   -- Example: "Italian", "Mexican"
    Type VARCHAR(50),       -- Example: "Breakfast", "Lunch", "Dinner"
    FOREIGN KEY (MealTypeID) REFERENCES MealType(MealTypeID),
    FOREIGN KEY (ProfileID) REFERENCES Profile(ProfileID)
);

-- Meal Type Table (e.g., Breakfast, Lunch, Dinner)
CREATE TABLE MealType (
    MealTypeID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(50)  -- Example: "Breakfast", "Lunch", "Dinner"
);
