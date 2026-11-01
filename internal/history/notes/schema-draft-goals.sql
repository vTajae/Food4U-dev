-- Imported from the pre-repo notes folder (Untitled Document 15); hackathon-era draft.

-- Goals Table (General types of goals)
CREATE TABLE Goals (
    goalID SERIAL PRIMARY KEY,
    goalType VARCHAR(100) NOT NULL, -- e.g., 'Weight', 'Health', 'Lifestyle'
    goalDescription TEXT, -- More detailed description of the goal
    requiresParameters BOOLEAN DEFAULT FALSE -- True if goal requires parameters (e.g., target weight)
);

-- UserGoals Table (Links users to specific goals, allowing customization)
CREATE TABLE UserGoals (
    userGoalID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    goalID INT REFERENCES Goals(goalID) ON DELETE CASCADE,
    targetValue VARCHAR(100), -- Optional target value (e.g., '70kg' for weight goal)
    startDate DATE DEFAULT CURRENT_DATE, -- When the goal started
    endDate DATE -- Optional end date if goal has a deadline
);


-- Users Table
CREATE TABLE Users (
    profileID SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    age INT,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    gender VARCHAR(10),
    goal VARCHAR(50) -- 'Lose Weight', 'Gain Weight', 'Maintain Weight', 'None'
);

-- Preferences Table (Tracks user preferences like dietary restrictions, quality preferences)
CREATE TABLE UserPreferences (
    preferenceID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    isVegetarian BOOLEAN DEFAULT FALSE,
    isVegan BOOLEAN DEFAULT FALSE,
    caloriePreference VARCHAR(50), -- 'Low-Calorie', 'High-Calorie', 'No Preference'
    qualityPreference VARCHAR(50) -- 'Organic', 'Non-GMO', 'Probiotic', 'No Preference'
);

-- Allergies Table (User allergy to specific ingredients)
CREATE TABLE Allergies (
    allergyID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    ingredientID INT REFERENCES Ingredients(ingredientID) ON DELETE CASCADE
);

-- Medical Information Table (Stores diagnosis and related info)
CREATE TABLE MedicalInformation (
    medicalInfoID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    diagnosis TEXT, -- Can store conditions like diabetes, hypertension
    additionalInfo TEXT -- Additional medical notes
);

-- Ingredients Table (Tracks meal ingredients)
CREATE TABLE Ingredients (
    ingredientID SERIAL PRIMARY KEY,
    ingredientName VARCHAR(100) NOT NULL,
    type VARCHAR(50) -- 'Protein', 'Carbohydrate', 'Fat', 'Other'
);

-- Meals Table (Each meal, with quality and calorie details)
CREATE TABLE Meals (
    mealID SERIAL PRIMARY KEY,
    mealName VARCHAR(100) NOT NULL,
    calories INT NOT NULL, -- Total calories in the meal
    isVegetarian BOOLEAN DEFAULT FALSE,
    isVegan BOOLEAN DEFAULT FALSE,
    isOrganic BOOLEAN DEFAULT FALSE,
    isNonGMO BOOLEAN DEFAULT FALSE,
    hasProbiotics BOOLEAN DEFAULT FALSE,
    containsSteroids BOOLEAN DEFAULT FALSE -- True if meal contains steroids
);

-- Meal Ingredients Table (Many-to-Many relationship between Meals and Ingredients)
CREATE TABLE MealIngredients (
    mealIngredientID SERIAL PRIMARY KEY,
    mealID INT REFERENCES Meals(mealID) ON DELETE CASCADE,
    ingredientID INT REFERENCES Ingredients(ingredientID) ON DELETE CASCADE,
    quantity DECIMAL(5,2), -- Quantity of the ingredient in the meal (optional)
    unit VARCHAR(20) -- Unit of measurement (e.g., grams, mg, etc.)
);

-- Additives Table (Tracks food additives and their quality attributes)
CREATE TABLE Additives (
    additiveID SERIAL PRIMARY KEY,
    additiveName VARCHAR(100) NOT NULL,
    isHarmful BOOLEAN DEFAULT FALSE -- True if the additive is harmful
);

-- Meal Additives Table (Links meals to additives like preservatives, GMOs, etc.)
CREATE TABLE MealAdditives (
    mealAdditiveID SERIAL PRIMARY KEY,
    mealID INT REFERENCES Meals(mealID) ON DELETE CASCADE,
    additiveID INT REFERENCES Additives(additiveID) ON DELETE CASCADE
);

-- Food Likes and Dislikes Tables
CREATE TABLE FoodLikes (
    likeID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    mealID INT REFERENCES Meals(mealID) ON DELETE CASCADE
);

CREATE TABLE FoodDislikes (
    dislikeID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    mealID INT REFERENCES Meals(mealID) ON DELETE CASCADE
);

-- User Meal Preferences (Categorical preferences by meal types)
CREATE TABLE Preferences (
    preferenceID SERIAL PRIMARY KEY,
    profileID INT REFERENCES Users(profileID) ON DELETE CASCADE,
    categoryID INT REFERENCES Categories(categoryID),
    preferenceType VARCHAR(50) NOT NULL -- 'Like', 'Dislike'
);





analyze this schema and ensure this data is normalized as much as possible for an optimal database integration.... consider reducing data redundancy as much as possible...

The main idea is that:



Users have allergies
Users have food/meal likes
Users have food/meal dislikes



meal is just a combination of food.
meals have ingredients
meals have photos

ingredients just have a name

meals have nutritional facts

nutritional facts have 




