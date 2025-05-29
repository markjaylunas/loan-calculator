import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

function currencyFormat(value: number | undefined) {
  if (value === undefined || isNaN(value)) {
    return "₱ 0.00";
  }
  const stringValue = new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `₱ ${stringValue}`;
}

// Zod schema for form validation
const loanFormSchema = z.object({
  loanAmount: z.coerce
    .number({ invalid_type_error: "Please enter a valid number" })
    .min(1, "Loan amount must be greater than 0")
    .max(1000000, "Loan amount must be less than 1,000,000")
    .optional(),
  months: z.coerce
    .number({ invalid_type_error: "Please enter a valid number" })
    .min(1, "Months must be at least 1")
    .max(360, "Months cannot exceed 360")
    .optional(),
  interestRatePerMonth: z.coerce
    .number({ invalid_type_error: "Please enter a valid number" })
    .min(0.1, "Interest rate must be at least 0.1%")
    .max(100, "Interest rate cannot exceed 100%")
    .optional(),
});

type LoanForm = z.infer<typeof loanFormSchema>;

const CUSTOM_INTEREST_RATE_KEY = "customInterestRate";

export default function Index() {
  const {
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<LoanForm>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      months: 1,
      interestRatePerMonth: 10,
    },
    mode: "onChange",
  });

  const loanAmount = watch("loanAmount");
  const months = watch("months");
  const interestRatePerMonth = watch("interestRatePerMonth");

  const [showInterestRateModal, setShowInterestRateModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // State for the modal's temporary interest rate
  const [modalInterestRate, setModalInterestRate] = useState<
    number | undefined
  >(undefined);

  // --- Refs for scrolling ---
  const scrollViewRef = useRef<ScrollView>(null);
  const infoCardRef = useRef<View>(null);
  const [infoCardYPosition, setInfoCardYPosition] = useState<number | null>(
    null
  );

  // --- Helper Functions and Effects ---

  const calculateInterest = useCallback(
    (loan: number, rate: number, numMonths: number) => {
      if (
        isNaN(loan) ||
        isNaN(rate) ||
        isNaN(numMonths) ||
        loan === undefined ||
        rate === undefined ||
        numMonths === undefined
      ) {
        return 0;
      }
      const calculated = loan * (rate / 100) * numMonths;
      return calculated;
    },
    []
  );

  const generateTableData = useCallback(() => {
    const data = [];
    if (
      loanAmount !== undefined &&
      interestRatePerMonth !== undefined &&
      months !== undefined &&
      months >= 1
    ) {
      const actualMonthsToShow = Math.min(Math.ceil(months / 12) * 12, 360);

      for (let i = 1; i <= actualMonthsToShow; i++) {
        const interest = calculateInterest(loanAmount, interestRatePerMonth, i);
        const totalAmount = loanAmount + interest;
        const monthlyPayment = i > 0 ? totalAmount / i : totalAmount;

        data.push({
          month: i,
          interestAmount: interest,
          totalAmount: totalAmount,
          monthlyPayment: monthlyPayment,
        });
      }
    }
    return data;
  }, [loanAmount, interestRatePerMonth, months, calculateInterest]);

  const tableData = generateTableData();

  const getSelectedMonthSummary = useCallback(() => {
    if (selectedMonth === null) {
      // If no month is selected, default to the first month in the tableData
      return tableData.length > 0 ? tableData[0] : null;
    }
    const summary = tableData.find((item) => item.month === selectedMonth);
    return summary;
  }, [selectedMonth, tableData]);

  const summaryData = getSelectedMonthSummary();

  // Save custom interest rate to AsyncStorage
  const saveCustomInterestRate = useCallback(
    async (rate: number) => {
      try {
        await AsyncStorage.setItem(CUSTOM_INTEREST_RATE_KEY, rate.toString());
        setValue("interestRatePerMonth", rate);
        setShowInterestRateModal(false);
      } catch (e) {
        console.error("Failed to save custom interest rate:", e);
        Alert.alert("Error", "Could not save interest rate.");
      }
    },
    [setValue]
  );

  // Load custom interest rate from AsyncStorage on mount
  useEffect(() => {
    const loadCustomInterestRate = async () => {
      try {
        const storedRate = await AsyncStorage.getItem(CUSTOM_INTEREST_RATE_KEY);
        if (storedRate !== null) {
          const parsedRate = parseFloat(storedRate);
          if (!isNaN(parsedRate) && parsedRate >= 0.1 && parsedRate <= 100) {
            setValue("interestRatePerMonth", parsedRate);
          } else {
            await AsyncStorage.removeItem(CUSTOM_INTEREST_RATE_KEY);
            setValue("interestRatePerMonth", 10);
          }
        }
      } catch (e) {
        console.error("Failed to load custom interest rate:", e);
        Alert.alert("Error", "Could not load saved interest rate.");
      }
    };
    loadCustomInterestRate();
  }, [setValue]);

  // Unified effect to manage selectedMonth
  useEffect(() => {
    if (months !== undefined) {
      setSelectedMonth(months);
    } else {
      setSelectedMonth(null);
    }
  }, [months, loanAmount, interestRatePerMonth]);

  // --- Event Handlers ---
  const handleLoanAmountChange = (text: string) => {
    const num = parseFloat(text);
    setValue("loanAmount", isNaN(num) ? undefined : num);
  };

  const handleMonthsDecrement = () => {
    const newMonths = Math.max(1, (months || 0) - 1);
    setValue("months", newMonths);
  };

  const handleMonthsIncrement = () => {
    const newMonths = Math.min(360, (months || 0) + 1);
    setValue("months", newMonths);
  };

  const handleMonthsTextChange = (text: string) => {
    const num = parseInt(text, 10);
    setValue("months", isNaN(num) ? undefined : num);
  };

  const handleMonthsBlur = () => {
    const currentMonths = getValues("months");
    if (
      isNaN(currentMonths || 0) ||
      currentMonths === undefined ||
      currentMonths < 1
    ) {
      setValue("months", 1);
    } else if (currentMonths > 360) {
      setValue("months", 360);
    }
  };

  const handleModalInterestRateTextChange = (text: string) => {
    const num = parseFloat(text);
    setModalInterestRate(isNaN(num) ? undefined : num);
  };

  const handleSaveInterestRate = () => {
    if (modalInterestRate !== undefined && !isNaN(modalInterestRate)) {
      saveCustomInterestRate(modalInterestRate);
    } else {
      Alert.alert(
        "Invalid Input",
        "Please enter a valid number for interest rate."
      );
    }
  };

  const handleCloseInterestRateModal = () => {
    setModalInterestRate(interestRatePerMonth);
    setShowInterestRateModal(false);
  };

  // --- Handle Row Click and Scroll ---
  const handleRowClick = (month: number) => {
    setSelectedMonth(month);
    setValue("months", month);
    if (
      infoCardRef.current &&
      scrollViewRef.current &&
      infoCardYPosition !== null
    ) {
      scrollViewRef.current.scrollTo({
        y: infoCardYPosition,
        animated: true,
      });
    }
  };

  // Determine the actual number of months displayed for the section title
  const displayMonthsForTitle =
    tableData.length > 0 ? tableData[tableData.length - 1].month : months || 0;

  // --- Render JSX ---

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="always"
      >
        <Text style={styles.title}>Loan Calculator</Text>

        {/* Loan Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Loan Amount (₱)</Text>
          <Controller
            control={control}
            name="loanAmount"
            render={({ field: { onBlur, value } }) => (
              <TextInput
                placeholder="ex. 1000"
                keyboardType="numeric"
                value={
                  value !== undefined && value !== null ? String(value) : ""
                }
                onChangeText={handleLoanAmountChange} // Use custom handler
                onBlur={onBlur} // Keep onBlur from field
                style={[styles.input, errors.loanAmount && styles.inputError]}
              />
            )}
          />
          {errors.loanAmount && (
            <Text style={styles.errorText}>{errors.loanAmount.message}</Text>
          )}
        </View>

        {/* Months Input with +/- buttons */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Months</Text>
          <View style={styles.monthsInputContainer}>
            <TextInput
              value={months !== undefined ? String(months) : ""}
              keyboardType="numeric"
              onChangeText={handleMonthsTextChange}
              onBlur={handleMonthsBlur}
              style={[
                styles.input,
                styles.monthInput,
                errors.months && styles.inputError,
              ]}
            />
            <View style={styles.monthsButtonColumn}>
              <TouchableOpacity
                style={styles.monthIconButton}
                onPress={handleMonthsDecrement}
              >
                <Text style={styles.monthIconButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.monthIconButton}
                onPress={handleMonthsIncrement}
              >
                <Text style={styles.monthIconButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.months && (
            <Text style={styles.errorText}>{errors.months.message}</Text>
          )}
        </View>

        {/* Interest Rate Display and Edit Button */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Interest Rate Per Month</Text>
          <View style={styles.interestRateRow}>
            <View style={styles.interestRateDisplay}>
              <Text style={styles.interestRateText}>
                {interestRatePerMonth !== undefined
                  ? interestRatePerMonth.toFixed(1)
                  : "N/A"}
                <Text>%</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowInterestRateModal(true)}
            >
              <Text style={styles.editButtonText}>Edit Rate</Text>
            </TouchableOpacity>
          </View>
          {errors.interestRatePerMonth && (
            <Text style={styles.errorText}>
              {errors.interestRatePerMonth.message}
            </Text>
          )}
        </View>

        {/* --- Combined Loan Info Card --- */}
        <View
          ref={infoCardRef}
          onLayout={(event) => {
            if (infoCardYPosition === null) {
              setInfoCardYPosition(event.nativeEvent.layout.y);
            }
          }}
          style={styles.infoCard}
        >
          {/* Divider and Summary details for selected month */}
          {summaryData && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Loan:</Text>
                <Text style={styles.infoValue}>
                  {currencyFormat(loanAmount)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Text style={styles.infoLabel}>Total Loan</Text>
                  <Text style={styles.infoDownlight}>(incl. interest)</Text>
                </View>
                <Text style={styles.infoValue}>
                  {currencyFormat(summaryData.totalAmount)}
                </Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.summaryTitle}>
                Summary for
                <Text style={styles.textHighlight}>
                  {` ${summaryData.month} Month${
                    summaryData.month === 1 ? "" : "s"
                  }`}
                </Text>
              </Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Interest Rate:</Text>
                <Text style={styles.summaryValue}>
                  {interestRatePerMonth !== undefined
                    ? interestRatePerMonth.toFixed(1)
                    : "N/A"}
                  <Text>%</Text>
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Interest:</Text>
                <Text style={styles.summaryValue}>
                  {currencyFormat(summaryData.interestAmount)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Monthly Payment:</Text>
                <Text style={[styles.summaryValue]}>
                  {currencyFormat(summaryData.monthlyPayment)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* --- Loan Calculation Table --- */}
        <Text style={styles.sectionTitle}>
          Calculations (Up to <Text>{displayMonthsForTitle}</Text> Months)
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Month</Text>
            <Text style={styles.tableHeaderText}>Interest</Text>
            <Text style={styles.tableHeaderText}>Total Loan</Text>
            <Text style={styles.tableHeaderText}>Monthly Pay</Text>
          </View>
          {tableData.map((row) => (
            <TouchableOpacity
              key={row.month}
              style={[
                styles.tableRow,
                selectedMonth === row.month && styles.selectedTableRow,
              ]}
              onPress={() => handleRowClick(row.month)}
            >
              <Text style={styles.tableCell}>{row.month}</Text>
              <Text style={styles.tableCell}>
                {currencyFormat(row.interestAmount)}
              </Text>
              <Text style={styles.tableCell}>
                {currencyFormat(row.totalAmount)}
              </Text>
              <Text style={styles.tableCell}>
                {currencyFormat(row.monthlyPayment)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- Interest Rate Edit Modal --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showInterestRateModal}
          onRequestClose={handleCloseInterestRateModal}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Edit Interest Rate (%)</Text>
              <TextInput
                placeholder="Enter new rate"
                keyboardType="numeric"
                value={
                  modalInterestRate !== undefined
                    ? String(modalInterestRate)
                    : ""
                }
                onChangeText={handleModalInterestRateTextChange}
                autoFocus={true}
                style={[styles.input, styles.modalInput]}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonClose]}
                  onPress={handleCloseInterestRateModal}
                >
                  <Text style={styles.textStyle}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSave]}
                  onPress={handleSaveInterestRate}
                >
                  <Text style={styles.textStyle}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: Platform.OS === "android" ? 30 : 0,
  },
  container: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  inputGroup: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    backgroundColor: "#fff",
    color: "#333",
  },
  inputError: {
    borderColor: "#ff6347",
  },
  errorText: {
    color: "#ff6347",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  monthsInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  monthInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    marginRight: 10,
    paddingVertical: 12,
  },
  monthsButtonColumn: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  monthIconButton: {
    backgroundColor: "#007bff",
    width: 50,
    height: 50,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  monthIconButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: Platform.OS === "ios" ? 24 : 28,
  },
  interestRateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  interestRateDisplay: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    flex: 1,
    marginRight: 10,
  },
  interestRateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  editButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoCard: {
    width: "100%",
    backgroundColor: "#e6f7ff", // Light blue background for emphasis
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: "#91d5ff", // Slightly darker blue border
    marginBottom: 20, // Space below the card
    elevation: 3, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10, // Space between rows
  },
  infoLabelContainer: {
    flexDirection: "column",
    gap: 0,
  },
  infoLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  infoDownlight: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff", // Blue color for the value
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 30,
    marginBottom: 15,
    color: "#333",
    alignSelf: "flex-start",
    width: "100%",
  },
  table: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tableHeaderText: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    color: "#555",
    fontSize: 14,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  selectedTableRow: {
    backgroundColor: "#e6f7ff",
    borderLeftWidth: 5,
    borderLeftColor: "#007bff",
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    color: "#333",
  },
  // New styles for the combined info card's summary part
  divider: {
    borderBottomColor: "#91d5ff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 15,
    width: "100%",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    alignSelf: "flex-start", // Align left within the card
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#555",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  summaryValueHighlight: {
    color: "#007bff",
    fontWeight: "bold",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  modalInput: {
    width: "100%",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    minWidth: 100,
    alignItems: "center",
  },
  buttonClose: {
    backgroundColor: "#ccc",
  },
  buttonSave: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
  textHighlight: {
    color: "#007bff",
    fontWeight: "bold",
  },
});
