CREATE TABLE Users (
    profileID PRIMARY KEY,
    age INT,
    weight DECIMAL(5,2), -- Current weight
    height DECIMAL(5,2),
    gender VARCHAR(10)
);


CREATE TABLE UserPreferences (
    preferenceID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    isVegetarian BOOLEAN DEFAULT FALSE,
    isVegan BOOLEAN DEFAULT FALSE,
    caloriePreference VARCHAR(50), -- 'Low-Calorie', 'High-Calorie', 'No Preference'
    qualityPreference VARCHAR(50) -- 'Organic', 'Non-GMO', 'Probiotic', 'No Preference'
);


CREATE TABLE Goals (
    goalID SERIAL PRIMARY KEY,
    goalType VARCHAR(100) NOT NULL, -- 'Weight', 'Health', 'Lifestyle', etc.
    goalDescription TEXT, -- Detailed description of the goal
    requiresParameters BOOLEAN DEFAULT FALSE -- True if goal requires specific parameters
);


CREATE TABLE UserGoals (
    userGoalID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    goalID INT REFERENCES Goals(goalID) ON DELETE CASCADE,
    targetValue VARCHAR(100), -- e.g., '70kg' for weight goal, optional
    startDate DATE DEFAULT CURRENT_DATE,
    endDate DATE -- Optional end date if goal has a deadline
);


CREATE TABLE Allergies (
    allergyID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    ingredientID INT REFERENCES Ingredients(ingredientID) ON DELETE CASCADE
);


CREATE TABLE MedicalInformation (
    medicalInfoID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    diagnosis TEXT, -- Stores medical diagnosis like 'Diabetes', 'Hypertension', etc.
    additionalInfo TEXT -- Any additional medical notes
);


CREATE TABLE Ingredients (
    ingredientID SERIAL PRIMARY KEY,
    ingredientName VARCHAR(100) NOT NULL
);


CREATE TABLE Meals (
    mealID SERIAL PRIMARY KEY,
    mealName VARCHAR(100) NOT NULL,
    calories INT NOT NULL, -- Total calories
    isVegetarian BOOLEAN DEFAULT FALSE,
    isVegan BOOLEAN DEFAULT FALSE,
    isOrganic BOOLEAN DEFAULT FALSE,
    isNonGMO BOOLEAN DEFAULT FALSE,
    hasProbiotics BOOLEAN DEFAULT FALSE,
    containsSteroids BOOLEAN DEFAULT FALSE -- True if meal contains steroids
);



CREATE TABLE Ingredients (
    ingredientID SERIAL PRIMARY KEY,
    ingredientName VARCHAR(100) NOT NULL
);


CREATE TABLE Meals (
    mealID SERIAL PRIMARY KEY,
    mealName VARCHAR(100) NOT NULL,
    calories INT NOT NULL, -- Total calories
    isVegetarian BOOLEAN DEFAULT FALSE,
    isVegan BOOLEAN DEFAULT FALSE,
    isOrganic BOOLEAN DEFAULT FALSE,
    isNonGMO BOOLEAN DEFAULT FALSE,
    hasProbiotics BOOLEAN DEFAULT FALSE,
    containsSteroids BOOLEAN DEFAULT FALSE -- True if meal contains steroids
);


CREATE TABLE MealIngredients (
    mealIngredientID SERIAL PRIMARY KEY,
    mealID INT REFERENCES Meals(mealID) ON DELETE CASCADE,
    ingredientID INT REFERENCES Ingredients(ingredientID) ON DELETE CASCADE,
    quantity DECIMAL(5,2), -- Quantity of the ingredient
    unit VARCHAR(20) -- Unit of measurement (e.g., grams, mg)
);


CREATE TABLE MealPhotos (
    photoID SERIAL PRIMARY KEY,
    mealID INT REFERENCES Meals(mealID) ON DELETE CASCADE,
    photoURL VARCHAR(255) NOT NULL -- URL or file path to the photo
);


CREATE TABLE NutritionalFacts (
    factID SERIAL PRIMARY KEY,
    mealID INT REFERENCES Meals(mealID) ON DELETE CASCADE,
    protein DECIMAL(5,2), -- Protein in grams
    carbohydrates DECIMAL(5,2), -- Carbs in grams
    fats DECIMAL(5,2), -- Fats in grams
    fiber DECIMAL(5,2), -- Fiber in grams
    sugar DECIMAL(5,2), -- Sugar in grams
    sodium DECIMAL(5,2) -- Sodium in milligrams
);


CREATE TABLE UserMealPreferences (
    preferenceID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    mealID INT REFERENCES Meals(mealID) ON DELETE CASCADE,
    preferenceType VARCHAR(50) NOT NULL -- 'Like' or 'Dislike'
);


CREATE TABLE Additives (
    additiveID SERIAL PRIMARY KEY,
    additiveName VARCHAR(100) NOT NULL,
    isHarmful BOOLEAN DEFAULT FALSE -- True if the additive is harmful
);


CREATE TABLE UserMealPreferences (
    preferenceID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    mealID INT REFERENCES Meals(mealID) ON DELETE CASCADE,
    preferenceType VARCHAR(50) NOT NULL -- 'Like' or 'Dislike'
);


CREATE TABLE Additives (
    additiveID SERIAL PRIMARY KEY,
    additiveName VARCHAR(100) NOT NULL,
    isHarmful BOOLEAN DEFAULT FALSE -- True if the additive is harmful
);


CREATE TABLE MealAdditives (
    mealAdditiveID SERIAL PRIMARY KEY,
    mealID INT REFERENCES Meals(mealID) ON DELETE CASCADE,
    additiveID INT REFERENCES Additives(additiveID) ON DELETE CASCADE
);


CREATE TABLE Preferences (
    preferenceID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    categoryID INT REFERENCES Categories(categoryID), -- Links to food categories like 'Breakfast', 'Dinner'
    preferenceType VARCHAR(50) NOT NULL -- 'Like' or 'Dislike'
);


CREATE INDEX idx_user_profileID ON UserMealPreferences(profileID);
CREATE INDEX idx_meal_mealID ON MealIngredients(mealID);
CREATE INDEX idx_additives_mealID ON MealAdditives(mealID);
