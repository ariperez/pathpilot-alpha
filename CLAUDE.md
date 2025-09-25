# Critical Medical Data Handling Rules

NEVER add artificial limits, fallbacks, or default values to medical data. Medical data accuracy is paramount - if data is unavailable, missing, or errors occur, the system MUST clearly indicate this rather than providing potentially misleading fallback values. This includes: no fallback counts (like `|| 0`), no artificial pagination limits, no default values for missing data, and no caps on risk scores or lab results. The system must fetch exactly what is requested and fail transparently when data cannot be retrieved. Patient safety depends on accurate data representation - incomplete or estimated data can lead to dangerous clinical decisions. Always let the FHIR API handle its own constraints and pagination, and if the API doesn't return expected data (like a total count), throw a clear error rather than guessing or providing a default.

# MIMIC-IV Dataset Characteristics

This application uses the MIMIC-IV dataset, which is de-identified medical data that has been modified for HIPAA compliance:

## Expected Data Patterns (NOT bugs):

1. **Future Birth Dates (e.g., 2083-04-10)**
   - Dates are intentionally shifted 100+ years into the future for de-identification
   - This results in negative ages (e.g., -57 years) which is EXPECTED
   - DO NOT attempt to "fix" these dates by subtracting 100 years

2. **Generic Patient Names (e.g., "Patient_10007795")**
   - Real names are replaced with generic format for privacy
   - This is intentional anonymization, not missing data
   - Display as "Patient ID: XXXXX" for clarity

3. **No Medical Record Numbers (MRNs)**
   - Only anonymized patient IDs are provided (e.g., "10007795")
   - These IDs are consistent within the dataset but meaningless outside it
   - Cannot be traced back to real patients (HIPAA requirement)

## Frontend Handling:
- Display all data exactly as received from the API
- Negative ages and future dates are CORRECT for this de-identified dataset
- Do not implement "fixes" or workarounds for these patterns
- These are privacy features, not data quality issues