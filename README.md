# Loan Calculator App

A simple and intuitive mobile application built with React Native for calculating loan details, including total interest, total amount payable, and monthly payments. Users can adjust the loan amount, duration (in months), and a custom monthly interest rate. The app also provides a detailed breakdown table and saves the last used custom interest rate.

## Features

- **Loan Amount Input:** Easily set the principal loan amount.
- **Months Input:** Adjust the loan duration using number input or convenient increment/decrement buttons.
- **Custom Monthly Interest Rate:** Set your own monthly interest rate. The app remembers your last custom rate.
- **Dynamic Calculations:** Instantly view:
  - Principal Loan
  - Total Loan (including interest)
  - Total Interest Amount
  - Estimated Monthly Payment
- **Interactive Loan Table:** A detailed table showing calculations for each month, allowing users to tap a row to see the summary for that specific month.
- **Input Validation:** Ensures valid numerical inputs and provides helpful error messages.
- **Persistence:** Saves the last used custom interest rate using `AsyncStorage`.

## Technologies Used

- **React Native:** For building cross-platform mobile applications.
- **TypeScript:** For type safety and improved code quality.
- **`react-hook-form`:** For efficient and flexible form management.
- **`@hookform/resolvers/zod`:** Integrates Zod for robust schema validation with React Hook Form.
- **`zod`:** A powerful schema declaration and validation library.
- **`@react-native-async-storage/async-storage`:** For persistent data storage on the device.

## Installation

To run this project locally, follow these steps:

1.  **Clone the repository:**

    ```bash
    git clone <your-repo-url-here>
    cd loan-calculator-app
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # OR
    yarn install
    ```

3.  **Install CocoaPods (for iOS development):**
    If you're developing for iOS, navigate to the `ios` directory and install CocoaPods:

    ```bash
    cd ios
    pod install
    cd ..
    ```

4.  **Run the application:**

    - **For Android:**
      ```bash
      npx react-native run-android
      ```
    - **For iOS:**
      ```bash
      npx react-native run-ios
      ```
      (Make sure you have an iOS simulator or a connected device configured.)

## Usage

1.  **Enter Loan Amount:** Type the desired loan principal in the "Loan Amount (₱)" field.
2.  **Set Months:** Use the input field or the `+` and `-` buttons to adjust the loan duration in months.
3.  **Adjust Interest Rate:**
    - The current monthly interest rate is displayed.
    - Tap "Edit Rate" to open a modal.
    - Enter your desired monthly interest rate (%) in the modal and tap "Save". This rate will be saved for future use.
4.  **View Calculations:** The "Combined Loan Info Card" at the top will automatically update with the principal, total loan, and estimated monthly payment.
5.  **Explore Table Details:** Scroll down to the "Calculations Table" to see a month-by-month breakdown. Tap on any row in the table to update the "Combined Loan Info Card" to show the summary for that specific month, and the view will automatically scroll to the card.

## Project Structure.

├── src/
│ └── components/
│ └── Index.tsx # Main application component
├── App.tsx # Root component (if applicable, or Index.tsx is main)
├── package.json
├── tsconfig.json
└── README.md
