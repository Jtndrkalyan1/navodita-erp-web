const db = require('../config/database');

const DEFAULT_POLICIES = [
  {
    policy_name: 'Prevention of Sexual Harassment (POSH) Policy',
    policy_number: 'HR-POL-001',
    category: 'POSH',
    description: 'Policy for prevention, prohibition and redressal of sexual harassment at workplace as per the POSH Act, 2013 and latest compliance requirements',
    policy_content: `NAVODITA APPAREL - POSH POLICY (Updated February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. OBJECTIVE
This policy is formulated in compliance with the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (Act No. 14 of 2013), notified on 09.12.2013, and the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Rules, 2013.

2. SCOPE
This policy applies to all employees (permanent, temporary, contractual, trainees, apprentices), contractors, visitors, clients, and third parties at all Navodita Apparel workplaces including the registered office at Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon and any extended workplace as defined under Section 2(o) of the Act.

3. DEFINITION OF SEXUAL HARASSMENT (Section 2(n))
Sexual harassment includes any one or more of the following unwelcome acts or behaviour:
(i) Physical contact and advances
(ii) A demand or request for sexual favours
(iii) Making sexually coloured remarks
(iv) Showing pornography
(v) Any other unwelcome physical, verbal or non-verbal conduct of sexual nature
The following circumstances, among others, if occurring in relation to the above, amount to sexual harassment:
- Implied or explicit promise of preferential treatment in employment
- Implied or explicit threat of detrimental treatment in employment
- Implied or explicit threat about present or future employment status
- Interference with work or creating an intimidating, hostile, or offensive work environment
- Humiliating treatment likely to affect health or safety

4. INTERNAL COMPLAINTS COMMITTEE (ICC) - Section 4
An Internal Complaints Committee shall be constituted at every workplace with:
- Presiding Officer: A senior woman employee (Section 4(2)(a))
- Not less than two members from amongst employees committed to the cause of women or with legal knowledge/experience in social work (Section 4(2)(b))
- One external member from an NGO or association committed to the cause of women, or a person familiar with issues relating to sexual harassment (Section 4(2)(c))
- At least one-half of the total members shall be women (Section 4(2))
- Term: Maximum 3 years from the date of nomination (Section 4(3))
- Minimum 3 members required for quorum to conduct inquiry

5. COMPLAINT PROCEDURE (Sections 9-11)
(a) Any aggrieved woman may make a written complaint to the ICC within 3 months of the incident or the last incident in case of a series of incidents (Section 9(1))
(b) The time limit may be extended by a further period of 3 months if the ICC is satisfied that circumstances prevented the woman from filing within the initial period (Section 9(1) Proviso)
(c) Where the aggrieved woman is unable to make a complaint in writing, the Presiding Officer or any member shall render reasonable assistance (Section 9(2))
(d) In case of physical or mental incapacity or death, a complaint may be filed by legal heir, relative, friend, co-worker, or any person who has knowledge of the incident (Section 9(2))

6. INQUIRY PROCESS
- Upon receiving a complaint, ICC shall send one copy to the respondent within 7 working days (Section 11(1))
- The respondent shall file a reply within 10 working days (Section 11(2))
- The ICC shall complete the inquiry within 90 days (Section 11(4))
- During pendency, the ICC may recommend transfer of the aggrieved woman or the respondent, or grant leave up to 3 months (Section 12)
- Parties shall not be allowed to bring legal practitioners during the inquiry process (Section 11(3))

7. CONCILIATION (Section 10)
Before initiating an inquiry, the ICC may at the request of the aggrieved woman take steps to settle the matter through conciliation. No monetary settlement shall be the basis of conciliation.

8. ACTION ON INQUIRY (Section 13)
- If allegation is proved: ICC shall recommend disciplinary action including written apology, warning, reprimand, withholding of promotion, withholding of pay rise or increments, termination from service, undergoing a counselling session, or community service
- If allegation is not proved: No action against the complainant. However, action for malicious or false complaints under Section 14
- Compensation: ICC may recommend deduction from salary or wages of the respondent, considering mental trauma, loss of career opportunity, medical expenses, income and financial status of the respondent (Section 15)

9. PENALTIES FOR NON-COMPLIANCE (Sections 17, 26)
- For the respondent: Disciplinary action as per service rules, up to and including termination
- For the employer (non-compliance with Act): Fine up to Rs. 50,000 for first offence; for subsequent offences, fine up to Rs. 50,000 and/or cancellation of license/registration (Section 26)
- Non-constitution of ICC: Penalty under Section 26

10. ANNUAL COMPLIANCE REQUIREMENTS
(a) Annual report by ICC to employer and District Officer (Section 21)
(b) Include number of complaints filed, disposed of, and pending; action taken; time taken for disposal
(c) The employer shall include information about cases filed and disposed of in the annual report under Section 22 of Companies Act, 2013
(d) IMPORTANT: Annual filing with District Officer, Gurgaon, Haryana is mandatory

11. EMPLOYER OBLIGATIONS (Section 19)
(a) Provide a safe working environment
(b) Display conspicuous notice about the penal consequences of sexual harassment and the ICC composition
(c) Organize regular workshops and awareness programs (at least once a year)
(d) Provide necessary facilities to the ICC for dealing with complaints
(e) Assist in securing the attendance of respondent and witnesses
(f) Make available relevant information to the ICC
(g) Provide assistance to the woman if she chooses to file a criminal complaint
(h) Monitor timely submission of reports by the ICC
(i) Ensure that the aggrieved woman or witnesses are not victimized or discriminated against

12. CONFIDENTIALITY (Section 16)
Contents of the complaint, identity of the aggrieved woman, respondent, and witnesses, inquiry proceedings, recommendations, and action taken shall not be published, communicated, or made known to public, press, or media. Breach of confidentiality attracts a penalty as prescribed under the service rules.

Note: This policy is compliant with the Ministry of Women & Child Development guidelines and the Vishaka Guidelines (1997) as codified under the POSH Act, 2013. The four new Labour Codes (when notified for implementation) may subsume certain provisions; this policy will be updated accordingly.`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '2.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (Act No. 14 of 2013); POSH Rules, 2013; Vishaka & Ors v. State of Rajasthan (1997) 6 SCC 241; Companies Act, 2013 Section 22'
  },
  {
    policy_name: 'Employee State Insurance (ESI) Policy',
    policy_number: 'HR-POL-002',
    category: 'ESI',
    description: 'Employee State Insurance scheme guidelines, contribution rates, wage ceiling, and compliance requirements as per ESI Act 1948 and latest notifications',
    policy_content: `NAVODITA APPAREL - ESI POLICY (Updated February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001
ESI Code: [To be filled by employer]
Regional Office: ESIC Regional Office, Gurugram, Haryana

1. LEGAL BASIS
Employees' State Insurance Act, 1948 (Act No. 34 of 1948), as amended. The ESI Scheme is managed by the Employees' State Insurance Corporation (ESIC) under the Ministry of Labour & Employment, Government of India.

2. APPLICABILITY
(a) ESI is applicable to all factories and establishments employing 10 or more persons (as per notification S.O. 2592(E) dated 28.06.2010 for shops, hotels, restaurants, cinemas, etc.)
(b) Wage ceiling for coverage: Rs. 21,000 per month (enhanced from Rs. 15,000 vide notification S.O. 1407(E) dated 06.10.2016, effective 01.01.2017)
(c) For employees with disability: Rs. 25,000 per month
(d) All employees drawing gross wages up to the applicable ceiling are covered mandatorily
(e) Note: The Code on Social Security, 2020 (when notified for implementation) proposes to enhance the wage ceiling and expand coverage to all establishments with 10+ workers. As of February 2026, the existing ESI Act provisions continue to apply as the labour codes have not yet been notified for implementation.

3. CONTRIBUTION RATES (Current as of February 2026)
As per notification dated 01.07.2019:
- Employee Contribution: 0.75% of gross wages (reduced from 1.75% w.e.f. 01.07.2019)
- Employer Contribution: 3.25% of gross wages (reduced from 4.75% w.e.f. 01.07.2019)
- Total Contribution: 4.00% of gross wages
Note: The reduced rates were initially notified for 2 years but have been continued. Check ESIC circulars for any further revision.

4. WAGES FOR ESI CALCULATION
Gross wages include: Basic wages + DA + HRA + City Compensatory Allowance + Other allowances paid in cash (excluding overtime, annual bonus, and retrenchment compensation).

5. CONTRIBUTION PERIODS AND BENEFIT PERIODS
- Contribution Period 1: 1st April to 30th September --> Benefit Period: 1st January to 30th June (following year)
- Contribution Period 2: 1st October to 31st March --> Benefit Period: 1st July to 31st December (same year)

6. BENEFITS UNDER ESI SCHEME
(a) Medical Benefit (Section 56): Full medical care for insured person and family members at ESIC hospitals/dispensaries/panel clinics. No ceiling on medical expenditure. Super specialty treatment included.
(b) Sickness Benefit (Section 46): 70% of wages for up to 91 days in two consecutive benefit periods. Extended sickness benefit at 80% of wages for up to 2 years for 34 specified long-term diseases.
(c) Maternity Benefit (Section 50): Full wages for 26 weeks (extendable by 1 month on medical advice). Payable for all pregnancies including miscarriage (6 weeks) and adoption (12 weeks).
(d) Disablement Benefit (Section 51):
    - Temporary disablement: 90% of wages during medical treatment period
    - Permanent total disablement: 90% of wages as monthly pension for life
    - Permanent partial disablement: Proportionate to loss of earning capacity
(e) Dependants' Benefit (Section 52): 90% of wages as monthly pension to dependants in case of death due to employment injury.
(f) Funeral Expenses (Section 46-A): Rs. 15,000 (enhanced vide notification dated 21.07.2023)
(g) Confinement Expenses: Rs. 7,500 per confinement for insured women or wives of insured men where ESIC facilities are not available
(h) Vocational Rehabilitation: Training and placement for permanently disabled workers
(i) Unemployment Allowance (Atal Beemit Vyakti Kalyan Yojana): 50% of wages for up to 90 days in case of involuntary loss of employment (introduced from 01.07.2018, extended periodically)

7. REGISTRATION AND COMPLIANCE
(a) Employer Registration: Within 15 days of ESI applicability using Form-01 on ESIC Portal (www.esic.gov.in)
(b) Employee Registration: Within 10 days of joining using Form-1 (Aadhaar-linked)
(c) ESIC generates a 17-digit Insurance Number (IP Number) for each employee
(d) Pehchan Card issued as identity document

8. PAYMENT DEADLINES
(a) Monthly contribution: Must be deposited by the 15th of the following month via ESIC portal
(b) Interest on delayed payment: 12% per annum (Section 39(5)(a))
(c) Damages for default: 5% to 25% of arrears depending on delay period (Regulation 31C)

9. RETURNS AND RECORDS
(a) Monthly challan-cum-return via ESIC portal
(b) Half-yearly return in Form 5-A (abolished for e-filing; digital compliance mandatory)
(c) Accident report in Form 16 within 24 hours of any employment injury
(d) Maintain attendance register, wage register, and inspection book

10. PENALTIES FOR NON-COMPLIANCE
(a) Failure to pay contributions: Imprisonment up to 3 years and fine up to Rs. 10,000 (Section 85)
(b) False statement/representation: Imprisonment up to 6 months and/or fine up to Rs. 5,000 (Section 84)
(c) Obstruction of Inspector: Imprisonment up to 1 year and/or fine up to Rs. 5,000 (Section 86)
(d) Non-registration of employees: Recovery of arrears with damages and interest

11. HARYANA-SPECIFIC PROVISIONS
(a) ESI dispensaries and hospitals in Gurugram: ESIC Hospital, Sector 9A, Gurugram
(b) ESIC Regional Office Gurugram handles all claims and inspections for Navodita Apparel
(c) All Haryana establishments employing 10+ workers in notified areas (Gurugram is a fully notified area) are mandatorily covered

12. TRANSITION NOTE
The Code on Social Security, 2020 (passed by Parliament on 22.09.2020) proposes to subsume the ESI Act. Key proposed changes include: expanded coverage to establishments with 10+ workers across all sectors, proposed wage ceiling revision, and a unified social security fund. As of February 2026, the rules under the Code have not been notified for implementation in Haryana. Navodita Apparel will update this policy upon official notification.`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '2.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Employees State Insurance Act, 1948 (Act 34 of 1948); ESI (Central) Rules, 1950; S.O. 1407(E) dated 06.10.2016 (wage ceiling); Notification dated 01.07.2019 (reduced contribution rates); Code on Social Security, 2020 (pending implementation)'
  },
  {
    policy_name: 'Provident Fund (PF/EPF) Policy',
    policy_number: 'HR-POL-003',
    category: 'PF',
    description: 'Employee Provident Fund contribution rates, wage ceiling, withdrawal rules, and compliance as per EPF & MP Act 1952 and latest EPFO circulars',
    policy_content: `NAVODITA APPAREL - EPF/PF POLICY (Updated February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001
PF Establishment Code: [To be filled by employer]
EPFO Regional Office: EPFO, Regional Office, Faridabad (jurisdiction for Gurugram)

1. LEGAL BASIS
Employees' Provident Funds and Miscellaneous Provisions Act, 1952 (Act No. 19 of 1952), and the following schemes:
(a) Employees' Provident Funds Scheme, 1952 (EPF Scheme)
(b) Employees' Pension Scheme, 1995 (EPS-95)
(c) Employees' Deposit Linked Insurance Scheme, 1976 (EDLI Scheme)

2. APPLICABILITY
(a) Mandatory for every establishment employing 20 or more persons (Section 1(3))
(b) Applicable to all employees from the date of joining
(c) Wage ceiling for statutory contribution: Rs. 15,000 per month (basic + DA)
(d) Employees drawing basic + DA above Rs. 15,000/month may be enrolled at actual wages or at Rs. 15,000 (as per mutual agreement and establishment practice)
(e) International Workers: Covered under EPF Scheme from day one, no wage ceiling applies (unless from a country with Social Security Agreement with India)

3. CONTRIBUTION RATES (Current as of February 2026)
A. Employee Contribution: 12% of basic wages + DA + retaining allowance
B. Employer Contribution: 12% of basic wages + DA + retaining allowance, allocated as:
   - 3.67% to EPF (Employees' Provident Fund)
   - 8.33% to EPS (Employees' Pension Scheme) - subject to maximum of Rs. 15,000 (i.e., max Rs. 1,250/month to EPS)
   - If basic + DA exceeds Rs. 15,000, the 8.33% is calculated on Rs. 15,000 only, and the balance goes to EPF
C. Employer also pays:
   - EDLI Contribution: 0.50% of basic + DA (subject to ceiling of Rs. 15,000)
   - EPF Admin Charges: 0.50% of basic + DA (minimum Rs. 500 per month for establishments with fewer than 20 members)
   - EDLI Admin Charges: Nil (waived w.e.f. 01.04.2017 vide notification G.S.R. 365(E))

4. EPS-95 PENSION DETAILS
(a) Eligibility: Minimum 10 years of pensionable service, minimum age 58 years for superannuation pension
(b) Early pension at 50 years with 4% reduction for each year before 58
(c) Minimum pension: Rs. 1,000 per month (enhanced w.e.f. 01.09.2014)
(d) Supreme Court judgment in EPFO v. Sunil Kumar (Nov 2022): Employees who were members prior to 01.09.2014 and opted for higher pension under Section 11(3) of EPS-95 can contribute on actual wages (exceeding Rs. 15,000). The deadline for exercising this option was extended; employees should check current EPFO circulars.

5. EDLI (DEPOSIT LINKED INSURANCE)
(a) In case of death during service, nominee receives insurance benefit
(b) Maximum benefit: Rs. 7,00,000 (enhanced w.e.f. 28.04.2021 vide G.S.R. 296(E))
   - Benefit = 35 times the average monthly wages (last 12 months), subject to ceiling
   - Bonus: Additional 50% of the admissible amount (minimum total: Rs. 2,50,000)
(c) No employee contribution for EDLI

6. UNIVERSAL ACCOUNT NUMBER (UAN)
(a) Every employee is assigned a UAN which remains the same throughout their career
(b) UAN is linked to Aadhaar, PAN, and bank account (mandatory KYC)
(c) Transfer of PF between establishments is automatic via UAN
(d) Employees can track balance, download passbook, and file claims through EPFO Member Portal (unifiedportal-mem.epfindia.gov.in)

7. VOLUNTARY PROVIDENT FUND (VPF)
(a) Employees may voluntarily contribute above 12% up to 100% of basic + DA
(b) VPF earns the same interest rate as EPF (8.25% for FY 2023-24; 8.25% for FY 2024-25 as announced)
(c) Tax-free up to Rs. 2,50,000 aggregate PF contribution per year (Section 80C + taxability of interest on excess contribution as per Finance Act, 2021)

8. WITHDRAWAL AND TRANSFER RULES
(a) Full withdrawal: On retirement at 58, or cessation of employment for more than 2 months
(b) Partial withdrawal (Form 31) allowed for:
   - Medical treatment: Up to 6 times monthly wages (after 1 year)
   - Marriage: Up to 50% of employee share (after 7 years)
   - Housing: Up to 36 times monthly wages (after 5 years)
   - Education: Up to 50% of employee share (after 7 years)
   - Home loan repayment: Up to 90% of balance (after 10 years)
   - Pre-retirement (54+ years): Up to 90% of total balance
(c) Online claim settlement (Aadhaar-based) within 3 working days for KYC-compliant accounts
(d) Transfer: Automatically through UAN; Form 13 for manual transfer

9. PAYMENT DEADLINES AND COMPLIANCE
(a) Monthly deposit: By 15th of the following month (via ECR - Electronic Challan cum Return on EPFO Unified Portal)
(b) Monthly return: ECR to be filed by 15th of following month
(c) Annual return: Form 3A (individual) and Form 6A (consolidated) - now part of ECR
(d) Interest on delayed payment: 12% per annum under Section 7Q
(e) Damages for default: 5% to 100% of arrears depending on delay period (Section 14B, Para 32A of EPF Scheme)

10. PENALTIES FOR NON-COMPLIANCE
(a) Failure to pay contribution: Imprisonment up to 3 years and fine up to Rs. 10,000 (Section 14)
(b) Repeat offence: Imprisonment up to 5 years and fine up to Rs. 25,000 (Section 14(1A))
(c) False statement: Imprisonment up to 1 year and/or fine up to Rs. 5,000 (Section 14(2))
(d) 7A Inquiry: RPFC can determine the amount due and recover as arrears of land revenue

11. RECENT EPFO CIRCULARS
(a) EPFO has enabled auto-transfer of PF upon changing jobs (linked to UAN + Aadhaar)
(b) Higher pension option under EPS-95 (Supreme Court ruling of 04.11.2022): Members who were in service as on 01.09.2014 and contributed on salary above Rs. 5,000/6,500 ceiling may opt for higher pension. Validation ongoing by EPFO field offices.
(c) EPFO 3.0 (Centralized IT system): Being rolled out for faster claim settlement
(d) ABRY (Atmanirbhar Bharat Rozgar Yojana) benefits for new employees registered between Oct 2020 - Mar 2022 (subsidy for employers)

12. TRANSITION NOTE
The Code on Social Security, 2020 proposes to subsume the EPF & MP Act. Key changes: proposed wage ceiling revision, universal EPF for all establishments with 20+ workers, expanded scope. As of February 2026, the Code's rules have not been notified for implementation. Navodita Apparel will update this policy upon official notification.`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '2.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Employees Provident Funds and Miscellaneous Provisions Act, 1952 (Act 19 of 1952); EPF Scheme 1952; EPS-95; EDLI Scheme 1976; G.S.R. 296(E) dated 28.04.2021 (EDLI enhancement); Supreme Court judgment in EPFO v. Sunil Kumar (04.11.2022); Code on Social Security, 2020 (pending implementation)'
  },
  {
    policy_name: 'Minimum Wages Policy - Haryana',
    policy_number: 'HR-POL-004',
    category: 'Minimum Wages',
    description: 'Minimum wage compliance for Gurgaon/Gurugram as per Minimum Wages Act 1948 and latest Haryana Government VDA notifications',
    policy_content: `NAVODITA APPAREL - MINIMUM WAGES POLICY (Updated February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001
Applicable Zone: Zone A - Gurugram (Gurgaon) Municipal Corporation Area

1. LEGAL BASIS
(a) Minimum Wages Act, 1948 (Act No. 11 of 1948)
(b) Haryana Minimum Wages Rules, 1963
(c) Haryana Government Labour Department notifications for VDA revision (issued every 6 months, effective 1st April and 1st October each year)
(d) The Minimum Wages Act is a scheduled employment Act; Haryana has notified 73 scheduled employments

2. APPLICABILITY
(a) Applicable to all employees of Navodita Apparel including permanent, temporary, probationary, contractual, casual, piece-rate, and daily-wage workers
(b) Applies irrespective of the number of employees in the establishment
(c) Covers all scheduled employments including: employment in garment manufacturing / textile industry / shops and commercial establishments

3. MINIMUM WAGE RATES - HARYANA (Effective from latest notification)
Note: Haryana Government revises VDA every 6 months (April and October). The rates below reflect the most recent VDA notification available. Navodita Apparel HR must verify and update rates upon each new notification from the Haryana Labour Department.

Zone A (Gurugram/Gurgaon, Faridabad) - Shops & Commercial Establishments:
(a) Unskilled: Rs. 11,413 per month (approx.) [Basic + VDA as per latest notification]
(b) Semi-Skilled / Unskilled Supervisory: Rs. 12,553 per month (approx.)
(c) Skilled / Clerical: Rs. 13,693 per month (approx.)
(d) Highly Skilled: Rs. 15,103 per month (approx.)

IMPORTANT NOTE: The above rates are approximate based on available Haryana notification data. The exact rates must be confirmed from the latest Haryana Gazette notification available at hrylabour.gov.in. VDA is revised based on the Consumer Price Index (CPI) for industrial workers (base 2016=100) published by the Labour Bureau.

4. WAGE COMPONENTS
(a) Minimum wages comprise: Basic Wages + Variable Dearness Allowance (VDA)
(b) VDA is linked to the All-India Consumer Price Index for Industrial Workers (CPI-IW) with base year 2016=100
(c) VDA revision formula: For every 1-point increase in average CPI-IW, VDA increases by Rs. 1.72 per day (approximately) for Zone A
(d) Employer may pay above minimum wages but never below
(e) All components of wages (basic, HRA, other allowances) combined must not fall below the prescribed minimum wage

5. PAYMENT OF WAGES
(a) Wages must be paid before the 7th of the following month (for establishments with fewer than 1000 workers) or by 10th (for 1000+ workers) as per Payment of Wages Act, 1936
(b) Wages must be paid in Indian currency by direct bank transfer (Section 6, Payment of Wages Act)
(c) Wage slip / pay slip must be provided to each employee

6. OVERTIME
(a) Overtime wages: Double (2x) the ordinary rate of wages as per Section 59 of the Factories Act, 1948
(b) Maximum overtime: Must not exceed the limits prescribed under the Factories Act (ordinarily 50 hours per quarter)
(c) Overtime calculation: Ordinary rate = monthly wages / 26 / number of working hours; overtime rate = 2x ordinary rate

7. DEDUCTIONS (Payment of Wages Act, 1936 - Section 7)
Permissible deductions from wages:
(a) Fines (not exceeding 3% of wages, only for acts specified in the fine notice)
(b) Absence from duty
(c) Damage or loss of goods entrusted (after show cause)
(d) House accommodation and amenities provided by employer
(e) PF contributions, ESI contributions
(f) Income tax (TDS)
(g) Court orders / attachments
(h) Total deductions shall not exceed 50% of wages (75% if court orders included)

8. REGISTERS AND RECORDS
(a) Register of wages in Form VII (Minimum Wages Rules)
(b) Register of overtime in Form IV
(c) Muster Roll / Attendance Register
(d) Annual Return in Form III by 1st February of each year to the Inspector
(e) Display of minimum wage rates on notice board in Hindi and English

9. PENALTIES FOR NON-COMPLIANCE
(a) Payment below minimum wages: Imprisonment up to 6 months and/or fine up to Rs. 500 (Section 22, Minimum Wages Act). Note: Proposed enhancement under Code on Wages, 2019 to fine up to Rs. 50,000 for first offence.
(b) Non-maintenance of registers: Fine under Section 22A
(c) Inspector may order payment of difference if wages are below minimum wages (Section 20, Minimum Wages Act)
(d) Haryana Labour Department conducts regular inspections; penalty for obstruction of Inspector

10. CODE ON WAGES, 2019 - STATUS
(a) The Code on Wages, 2019 (Act No. 29 of 2019) was passed by Parliament on 02.08.2019 and received Presidential assent on 08.08.2019
(b) The Code subsumes four Acts: Minimum Wages Act 1948, Payment of Wages Act 1936, Payment of Bonus Act 1965, and Equal Remuneration Act 1976
(c) Key provisions: Universal minimum wage floor, statutory wage revision period, expanded definition of wages
(d) Status as of February 2026: The Central Government has published draft rules (November 2020) but the Code has NOT yet been notified for implementation. The existing Minimum Wages Act, 1948 continues to be in force.
(e) Navodita Apparel will update this policy immediately upon notification of the Code on Wages implementation date

11. EMPLOYER COMPLIANCE CHECKLIST
- [ ] Verify minimum wage rates from latest Haryana Gazette notification (April and October each year)
- [ ] Update payroll system within 15 days of new VDA notification
- [ ] Display current minimum wages on notice board
- [ ] Maintain all prescribed registers
- [ ] File annual return by 1st February
- [ ] Ensure no employee is paid below minimum wages including contract workers
- [ ] Maintain records for at least 3 years`,
    effective_date: '2026-02-01',
    review_date: '2026-10-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '2.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Minimum Wages Act, 1948 (Act 11 of 1948); Haryana Minimum Wages Rules, 1963; Payment of Wages Act, 1936; Haryana Labour Department VDA notifications (bi-annual); Code on Wages, 2019 (Act 29 of 2019) - pending implementation'
  },
  {
    policy_name: 'Leave Policy - Haryana',
    policy_number: 'HR-POL-005',
    category: 'Leave',
    description: 'Comprehensive leave entitlements as per Haryana Shops & Establishments Act, Factories Act, and Maternity Benefit Act with latest amendments',
    policy_content: `NAVODITA APPAREL - LEAVE POLICY (Updated February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. EARNED LEAVE / ANNUAL LEAVE (EL)
As per Haryana Shops and Commercial Establishments Act, 1958 (Section 15) and Factories Act, 1948 (Section 79):
- Entitlement: 1 day for every 20 days of work performed (approximately 15 days per year for those working all eligible days)
- Eligibility: After completion of 240 days of continuous service in a calendar year (180 days for employees working in underground mines or in the case of female employees)
- Accumulation: Up to 45 days maximum (as per Haryana rules); beyond this, EL may lapse unless encashed
- Encashment: Allowed at the time of resignation, termination, retirement, or superannuation. Mid-year encashment as per company discretion.
- Cannot be refused if applied with proper notice and balance is available
- Advance EL may be granted at the discretion of management

2. CASUAL LEAVE (CL)
As per Navodita Apparel company policy (not statutorily mandated but standard industry practice in Haryana):
- Entitlement: 12 days per calendar year (pro-rated for mid-year joiners)
- Cannot be accumulated or carried forward to the next year
- Maximum 3 consecutive days at a time
- CL is not encashable
- Cannot be combined with any other leave type except with prior approval

3. SICK LEAVE (SL)
As per Haryana Shops and Commercial Establishments Act provisions and company policy:
- Entitlement: 12 days per year (half pay) for shops/establishments employees
- Entitlement for factory workers: As per ESI benefits if ESI-covered; otherwise 12 days at half pay
- Medical certificate required for SL exceeding 2 consecutive days
- Can be accumulated up to 24 days; beyond that, unused SL lapses
- SL is not encashable
- For ESI-covered employees, sickness benefit under ESI at 70% of wages for up to 91 days per benefit period

4. MATERNITY LEAVE
As per the Maternity Benefit (Amendment) Act, 2017:
- 26 weeks of paid leave for first two children (up to 8 weeks before expected delivery)
- 12 weeks for third child onwards
- 12 weeks for adoptive mothers (child below 3 months)
- 12 weeks for commissioning mothers (from date of handing over the child)
- 6 weeks in case of miscarriage or medical termination of pregnancy
- Eligibility: Must have worked for at least 80 days in the 12 months preceding expected delivery
- Full salary payable during the maternity leave period
- No termination, discharge, or demotion during or on account of maternity leave
- Work from Home: Employer may allow WFH after the leave period on mutual agreement (Section 5(5))
- Creche facility mandatory for establishments with 50+ employees (Section 11A)
- Nursing breaks: Two breaks of 15 minutes each daily until the child attains 15 months of age (Section 11)
- Medical bonus: Rs. 3,500 or as notified (Section 8), if no pre-natal and post-natal care is provided free of charge

5. PATERNITY LEAVE
As per company policy (no Central legislation mandates paternity leave for private sector; however this is company practice):
- 15 working days within 6 months of childbirth
- Available for all male employees with at least 1 year of service
- Prior approval required from reporting manager (minimum 15 days notice)
- Non-encashable and non-accumulative

6. PUBLIC HOLIDAYS / GAZETTED HOLIDAYS
- As per Haryana Government annual notification (typically 15-17 gazetted holidays per year)
- Additional restricted holidays (2 per year, employee's choice)
- Weekly off: Sunday (or as per shift schedule for factory/shift workers)
- National holidays (mandatory): Republic Day (26 Jan), Independence Day (15 Aug), Gandhi Jayanti (2 Oct)
- Festival holidays as per Haryana Government notification each year

7. COMPENSATORY OFF
- Employees required to work on weekly off or public holidays shall be entitled to a compensatory off within 30 days
- Compensatory off not availed within 30 days shall lapse

8. SPECIAL LEAVE (Company Policy)
- Bereavement Leave: 3 days for death of immediate family member
- Marriage Leave: 3 days (once during service)
- Examination Leave: Up to 15 days per year for employees pursuing higher education (subject to approval)

9. LEAVE WITHOUT PAY (LWP / LOP)
- Applicable when all leave balances are exhausted
- Must be approved by Department Head and HR
- Extended LWP beyond 30 days may affect eligibility for annual increments, bonus, and continuity of service for gratuity calculation
- Unauthorized absence of more than 8 consecutive days may be treated as voluntary abandonment of service

10. LEAVE APPLICATION PROCEDURE
- All leave applications must be submitted through the HRMS/leave management system
- Planned leave: Minimum 3 working days advance notice for EL/CL
- Emergency leave: Inform supervisor by phone/email within 2 hours of shift start
- Approval hierarchy: Reporting Manager -> Department Head -> HR (for extended leave)
- Leave register maintained by HR department

11. STATUTORY REFERENCES
- Haryana Shops and Commercial Establishments Act, 1958 (Sections 14-18)
- Factories Act, 1948 (Sections 78-79)
- Maternity Benefit (Amendment) Act, 2017
- ESI Act, 1948 (for sickness benefit)
- Occupational Safety, Health and Working Conditions Code, 2020 (pending implementation) proposes: 1 day leave per 20 days worked, annual leave for all workers`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '2.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Haryana Shops and Commercial Establishments Act, 1958; Factories Act, 1948 (Section 79); Maternity Benefit (Amendment) Act, 2017; ESI Act, 1948; Occupational Safety, Health and Working Conditions Code, 2020 (pending implementation)'
  },
  {
    policy_name: 'Working Hours, Overtime & Rest Periods Policy',
    policy_number: 'HR-POL-006',
    category: 'Working Hours',
    description: 'Working hours, overtime, rest periods, night shifts, and women employee provisions as per Factories Act 1948 and Haryana Shops & Establishments Act',
    policy_content: `NAVODITA APPAREL - WORKING HOURS POLICY (Updated February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. LEGAL BASIS
(a) Factories Act, 1948 (Sections 51-66) - for factory workers
(b) Haryana Shops and Commercial Establishments Act, 1958 (Sections 7-13) - for office/commercial staff
(c) Haryana Factories Rules, 1950

2. REGULAR WORKING HOURS
(a) Factory workers (Factories Act):
    - Maximum 48 hours per week (Section 51)
    - Maximum 9 hours per day (Section 54)
    - Spread-over shall not exceed 10.5 hours including rest intervals (Section 56)
(b) Office/commercial staff (Haryana Shops & Establishments Act):
    - Maximum 48 hours per week (Section 7)
    - Maximum 9 hours per day
    - Spread-over shall not exceed 11 hours including rest intervals
(c) Standard office timing at Navodita Apparel: 9:30 AM to 6:30 PM with 1 hour lunch break (1:00 PM - 2:00 PM)

3. OVERTIME (Section 59, Factories Act; Section 9, Haryana Shops Act)
(a) Overtime wages: Double (2x) the ordinary rate of wages for all hours worked beyond 9 hours/day or 48 hours/week
(b) Overtime requires prior written approval from reporting manager and HR
(c) Maximum overtime for factory workers: Total working hours including overtime shall not exceed 60 hours in any week, and total overtime in any quarter shall not exceed 75 hours (Rule 87, Haryana Factories Rules)
(d) Overtime register must be maintained in Form 10 (Factories Act)
(e) Overtime wages must be paid before the expiry of the second wage period

4. REST PERIODS AND INTERVALS
(a) Rest interval: At least 30 minutes after every 5 hours of continuous work (Section 55, Factories Act)
(b) Weekly rest day: Sunday or substitute day (Section 52, Factories Act). No worker shall work for more than 10 consecutive days without a rest day.
(c) Compensatory holiday: If a worker is deprived of a weekly holiday, a compensatory holiday within the same month or within 2 months (Section 53, Factories Act)

5. WOMEN EMPLOYEES - WORKING HOURS
(a) Under Factories Act (Section 66): Women shall not be required or allowed to work in a factory except between 6 AM and 7 PM
(b) EXCEPTION: Haryana Government, vide notification dated 02.11.2005 and subsequent amendments, has permitted women to work in night shifts in IT/ITES and garment export units, subject to:
    - Written consent of the woman employee
    - Adequate safety and security measures (CCTV, security guards, well-lit premises)
    - Transportation facility (pick-up and drop by company vehicle)
    - Separate rest rooms and toilet facilities for women
    - Minimum 5 women workers per shift
    - Compliance with POSH Act requirements
(c) The Occupational Safety, Health and Working Conditions Code, 2020 (Section 43) proposes to allow women in all establishments for all shifts with employer consent and safety provisions. This is pending notification.

6. SHIFT WORK
(a) Shift timings shall be displayed on a conspicuous notice board at the workplace (Section 61, Factories Act)
(b) Shift change: No worker shall be transferred from one shift to another without at least 24-hour gap (Section 57)
(c) Shift registers maintained in Form 13 and Form 14 (Haryana Factories Rules)
(d) Night shift allowance: Rs. 100 per night shift (company policy, subject to revision)
(e) Rotation of shifts at regular intervals as per management discretion

7. ATTENDANCE
(a) Biometric/electronic attendance is mandatory for all employees
(b) Grace period: 10 minutes from shift start time
(c) Late arrival: Three or more late arrivals (beyond grace period) in a calendar month may result in deduction of half-day salary
(d) Muster Roll in Form 25 / electronic attendance record shall be maintained
(e) Employees must sign in and sign out; proxy attendance is a serious misconduct

8. YOUNG PERSONS (Sections 67-77, Factories Act)
(a) No child below 14 years shall be employed (Section 67)
(b) Adolescents (15-18 years) may work only with fitness certificate from certifying surgeon
(c) Maximum 4.5 hours per day for adolescents; no overtime, no night work

9. REGISTERS AND RECORDS
(a) Register of Adult Workers - Form 12 (Factories Act)
(b) Register of Child/Adolescent Workers - Form 15
(c) Overtime Register - Form 10
(d) Muster Roll - Form 25
(e) Leave with Wages Register - Form 15A/15B
(f) All records must be maintained for at least 3 years

10. PENALTIES
(a) Employment of workers beyond statutory hours: Fine up to Rs. 2 lakh for first offence (Section 92, Factories Act as amended)
(b) Non-payment of overtime wages: Recovery by Inspector + penalty under Payment of Wages Act
(c) Employment of women during prohibited hours without proper notification: Penalty under Section 92, Factories Act

11. TRANSITION NOTE
The Occupational Safety, Health and Working Conditions Code, 2020 (Chapter VII) proposes: maximum 8 hours/day, women allowed in all shifts with consent and safety measures, overtime limit of 125 hours per quarter (with state variation), and spread-over of 12 hours. As of February 2026, the Code rules have not been notified for implementation in Haryana.`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '2.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Factories Act, 1948 (Sections 51-66); Haryana Factories Rules, 1950; Haryana Shops and Commercial Establishments Act, 1958 (Sections 7-13); Occupational Safety, Health and Working Conditions Code, 2020 (pending implementation)'
  },
  {
    policy_name: 'Anti-Discrimination, Equal Opportunity & Equal Remuneration Policy',
    policy_number: 'HR-POL-007',
    category: 'General',
    description: 'Equal opportunity, anti-discrimination, and equal pay policy as per Constitution of India, Equal Remuneration Act, Rights of Persons with Disabilities Act, and Transgender Persons Act',
    policy_content: `NAVODITA APPAREL - ANTI-DISCRIMINATION & EQUAL OPPORTUNITY POLICY (Updated February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. COMMITMENT
Navodita Apparel is committed to providing equal employment opportunities to all persons and maintaining a workplace free from discrimination, harassment, and retaliation. This commitment extends to all aspects of employment including recruitment, hiring, training, promotion, compensation, benefits, transfer, and termination.

2. LEGAL BASIS
(a) Constitution of India - Articles 14 (Right to Equality), 15 (Prohibition of Discrimination), 16 (Equality of Opportunity in Public Employment), 21 (Right to Life and Personal Liberty), 23 (Prohibition of Trafficking and Forced Labour)
(b) Equal Remuneration Act, 1976 (to be subsumed by Code on Wages, 2019 upon implementation)
(c) Rights of Persons with Disabilities Act, 2016 (Act No. 49 of 2016)
(d) The Transgender Persons (Protection of Rights) Act, 2019 (Act No. 40 of 2019)
(e) Scheduled Castes and the Scheduled Tribes (Prevention of Atrocities) Act, 1989
(f) HIV and AIDS (Prevention and Control) Act, 2017
(g) Code on Wages, 2019 - Chapter IV (Prohibition of Gender Discrimination) - pending implementation

3. PROHIBITED DISCRIMINATION
Discrimination on the following grounds is strictly prohibited in all employment decisions:
(a) Caste, sub-caste, creed, or community
(b) Religion or religious practice
(c) Gender, gender identity, or gender expression
(d) Sexual orientation (as per NALSA v. Union of India, 2014 and Navtej Singh Johar v. Union of India, 2018 - Supreme Court)
(e) Race, ethnicity, place of birth, or national origin
(f) Age (except where age is a bona fide occupational requirement)
(g) Disability - physical, mental, intellectual, or sensory (as per RPwD Act, 2016)
(h) HIV/AIDS status (as per HIV and AIDS Act, 2017 - Section 3: prohibition of discrimination)
(i) Marital status, family status, or pregnancy
(j) Transgender status (as per Transgender Persons Act, 2019 - Section 3: prohibition of discrimination)
(k) Political affiliation or trade union membership
(l) Genetic information or medical condition

4. EQUAL PAY FOR EQUAL WORK
(a) As per Equal Remuneration Act, 1976 (Sections 4-5): No employer shall pay to any worker remuneration at rates less favourable than those at which remuneration is paid to workers of the opposite sex for the same work or work of a similar nature.
(b) No discrimination in recruitment, promotion, training, or transfer on grounds of sex
(c) The Code on Wages, 2019 (Section 3) reaffirms: No employer shall discriminate on grounds of gender in matters relating to wages by paying less wages to an employee doing the same work or work of a similar nature.
(d) Penalty for violation: Fine of Rs. 10,000 extendable to Rs. 20,000 under Equal Remuneration Act; proposed up to Rs. 50,000 under Code on Wages

5. DISABILITY INCLUSION (RPwD Act, 2016)
(a) Equal opportunity policy to be notified and registered with the District Disability Rehabilitation Centre
(b) Reasonable accommodations to be provided to persons with disabilities (Section 20)
(c) No establishment shall discriminate against any person with disability in matters of employment (Section 20(1))
(d) Barrier-free access to premises as far as practicable
(e) Grievance Redressal Officer to be appointed for disability-related complaints
(f) Penalty for contravention: Fine of Rs. 10,000 to Rs. 5,00,000 (Section 89)

6. TRANSGENDER PERSONS PROTECTION (Transgender Persons Act, 2019)
(a) No establishment shall discriminate against a transgender person in employment, including recruitment and promotion (Section 3)
(b) Every establishment shall comply with provisions relating to non-discrimination
(c) Transgender persons have the right to self-perceived gender identity
(d) Penalty for discrimination: Imprisonment of 6 months to 2 years and fine (Section 18)

7. GRIEVANCE MECHANISM
(a) Any employee who experiences or witnesses discrimination shall report it to HR Department or the Grievance Committee
(b) Complaints may be filed in writing, through email (hr@navoditaapparel.com), or through the HRMS grievance module
(c) All complaints shall be investigated within 30 days
(d) Confidentiality shall be maintained throughout the investigation
(e) No retaliation against the complainant or witnesses

8. CONSEQUENCES FOR VIOLATION
(a) Verbal or written warning for first offence
(b) Suspension without pay for repeat offences
(c) Termination for serious or persistent violations
(d) Legal action as applicable under relevant statutes
(e) Management and supervisory staff have a special obligation to prevent and report discrimination

9. AWARENESS AND TRAINING
(a) Annual anti-discrimination and diversity training for all employees
(b) Special training for managers and HR personnel on inclusive practices
(c) Display of anti-discrimination policy on notice board and intranet`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '2.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Constitution of India (Articles 14, 15, 16); Equal Remuneration Act, 1976; Rights of Persons with Disabilities Act, 2016 (Act 49 of 2016); Transgender Persons (Protection of Rights) Act, 2019 (Act 40 of 2019); HIV and AIDS (Prevention and Control) Act, 2017; SC/ST (Prevention of Atrocities) Act, 1989; Code on Wages, 2019 (pending implementation)'
  },
  {
    policy_name: 'Disciplinary & Grievance Redressal Policy',
    policy_number: 'HR-POL-008',
    category: 'General',
    description: 'Disciplinary procedures, Standing Orders compliance, and grievance redressal as per Industrial Disputes Act 1947 and Industrial Employment (Standing Orders) Act 1946',
    policy_content: `NAVODITA APPAREL - DISCIPLINARY & GRIEVANCE POLICY (Updated February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. LEGAL BASIS
(a) Industrial Disputes Act, 1947 (Sections 25F, 25FF, 25FFF, 33)
(b) Industrial Employment (Standing Orders) Act, 1946 and Haryana Industrial Employment (Standing Orders) Rules
(c) Haryana Shops and Commercial Establishments Act, 1958
(d) Model Standing Orders under Schedule I of IE(SO) Act, 1946
(e) Industrial Relations Code, 2020 (Chapter IX on Standing Orders) - pending implementation
Note: The Industrial Relations Code, 2020 (passed by Parliament on 22.09.2020) proposes to subsume the Industrial Disputes Act, 1947, the Trade Unions Act, 1926, and the Industrial Employment (Standing Orders) Act, 1946. As of February 2026, the Code's rules have not been notified for implementation by the Central or Haryana State Government.

2. PURPOSE
To maintain discipline, ensure fair treatment of all employees, and provide a transparent mechanism for grievance redressal while complying with principles of natural justice.

3. STANDING ORDERS
(a) Every industrial establishment employing 100+ workers must have certified Standing Orders (Section 3, IE(SO) Act, 1946). The threshold is proposed to be 300 workers under the Industrial Relations Code, 2020.
(b) Navodita Apparel has adopted Model Standing Orders as per Schedule I of the Act, covering: classification of workers, attendance, leave, termination, suspension, misconduct, and grievance procedure.
(c) Standing Orders are displayed on the notice board in Hindi and English.

4. TYPES OF MISCONDUCT (as per Model Standing Orders)
A. Minor Misconduct:
   - Late attendance (habitual)
   - Leaving premises without permission
   - Dress code violation
   - Minor negligence in duty
   - Unauthorized absence (1-2 days)
B. Major Misconduct:
   - Willful insubordination or disobedience
   - Theft, fraud, or dishonesty
   - Willful damage or loss of employer's goods or property
   - Taking or giving bribes
   - Habitual absence without leave for more than 8 consecutive days
   - Habitual late attendance
   - Habitual breach of any law applicable to the establishment
   - Riotous or disorderly behaviour
   - Habitual negligence or neglect of work
   - Strike or incitement in contravention of standing orders
   - Sexual harassment
   - Possession or consumption of intoxicants at workplace
   - Commission of any act subversive of discipline

5. DISCIPLINARY PROCEDURE
Step 1: VERBAL WARNING - For first-time minor offences. Documented in employee file.
Step 2: WRITTEN WARNING - For repeated minor offences or first-time moderate offence. Served with acknowledgment.
Step 3: SHOW CAUSE NOTICE - For major misconduct. The notice shall:
  (a) Clearly state the charge(s) and particulars of the alleged misconduct
  (b) Give the employee at least 7 days to submit a written explanation
  (c) Be served personally or by registered post
Step 4: DOMESTIC INQUIRY (for charges of major misconduct):
  (a) An impartial Inquiry Officer shall be appointed
  (b) The employee (referred to as the delinquent) shall be provided:
      - Copy of the charge sheet and all documents relied upon
      - Right to be heard in person or through a co-worker (not advocate)
      - Right to cross-examine management witnesses
      - Right to produce defence witnesses and documents
  (c) Inquiry Officer shall record proceedings and submit a report with findings
  (d) Principles of natural justice must be strictly followed
Step 5: PUNISHMENT ORDER:
  (a) Based on inquiry findings and considering the employee's past record
  (b) Punishment must be proportionate to the misconduct
  (c) The order must state reasons and be communicated in writing

6. PENALTIES
(a) Censure / verbal warning
(b) Written warning
(c) Fine (not exceeding 3% of wages payable in a wage period - Section 8, Payment of Wages Act)
(d) Withholding of increment or promotion
(e) Suspension without pay (not exceeding 4 days as punishment; for prolonged suspension during inquiry, subsistence allowance at 50% of wages payable)
(f) Demotion to a lower grade or post
(g) Compulsory retirement
(h) Termination with notice (1 month notice or pay in lieu + 15 days wages per year of service as retrenchment compensation for workers with 1+ year service under Section 25F, ID Act)
(i) Dismissal without notice (for gross misconduct, after due inquiry)

7. SUSPENSION DURING INQUIRY
(a) An employee may be suspended pending inquiry (Section 10A, IE(SO) Act)
(b) Subsistence allowance: 50% of wages for first 90 days, 75% thereafter if inquiry not completed due to no fault of the employee (Section 10A)
(c) If exonerated, full back wages shall be paid for the suspension period

8. TERMINATION / RETRENCHMENT (Section 25F, ID Act)
For workmen (as defined under ID Act) with 1+ year of continuous service:
(a) 1 month written notice or pay in lieu of notice
(b) Retrenchment compensation: 15 days average pay for every completed year of continuous service
(c) Notice to appropriate Government/authority as prescribed

9. APPEAL MECHANISM
(a) Employee may appeal against any disciplinary action within 15 days of the order to the next higher authority (or Appellate Authority as designated)
(b) The Appellate Authority shall dispose of the appeal within 30 days
(c) Employee's right to approach Labour Court / Industrial Tribunal under Section 10 of ID Act is not affected

10. GRIEVANCE REDRESSAL
(a) Grievance Committee constituted with equal representation from management and workers
(b) Any employee may submit a grievance in writing to the Grievance Committee
(c) Committee shall resolve the grievance within 45 days
(d) If unresolved, the grievance may be referred to the employer directly
(e) Maintaining a Grievance Register is mandatory

11. PENALTIES FOR EMPLOYER NON-COMPLIANCE
(a) Non-certification of Standing Orders: Fine up to Rs. 5,000 and Rs. 200 per day of continued default (Section 13, IE(SO) Act)
(b) Illegal termination/retrenchment: Reinstatement with back wages by Labour Court/Tribunal
(c) Non-compliance with Labour Court award: Imprisonment up to 6 months and/or fine (Section 29, ID Act)`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '2.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Industrial Disputes Act, 1947; Industrial Employment (Standing Orders) Act, 1946; Haryana IE(SO) Rules; Payment of Wages Act, 1936 (Section 8); Model Standing Orders (Schedule I); Industrial Relations Code, 2020 (pending implementation)'
  },
  {
    policy_name: 'Gratuity Policy',
    policy_number: 'HR-POL-009',
    category: 'Gratuity',
    description: 'Gratuity eligibility, calculation, maximum limit (Rs. 25 lakh), forfeiture, and compliance as per Payment of Gratuity Act 1972 with latest amendments',
    policy_content: `NAVODITA APPAREL - GRATUITY POLICY (Updated February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. LEGAL BASIS
Payment of Gratuity Act, 1972 (Act No. 39 of 1972), as amended by the Payment of Gratuity (Amendment) Act, 2018 and subsequent notifications.

2. APPLICABILITY
(a) The Act applies to every factory, mine, oilfield, plantation, port, railway company, and every shop or establishment employing 10 or more persons on any day of the preceding 12 months (Section 1(3))
(b) Once applicable, the Act continues to apply even if the number of employees falls below 10 (Section 1(3) Proviso)
(c) Navodita Apparel, being a garment manufacturing and export establishment, is covered under this Act

3. ELIGIBILITY (Section 4)
(a) An employee is eligible for gratuity after completing 5 years of continuous service
(b) The condition of 5 years is relaxed in case of:
    - Death of the employee (gratuity payable to nominee/legal heir irrespective of service period)
    - Disablement due to disease or accident (no minimum service required)
(c) Continuous service: An employee who has worked for not less than 190 days in a year (for establishments working below ground) or 240 days in a year (for other establishments) is deemed to have completed a year of continuous service (Section 2A)
(d) For 6-day work week: 240 days; For 5-day work week: 120 days
(e) Period of maternity leave is counted as days worked

4. CALCULATION FORMULA (Section 4(2))
Gratuity = (Last drawn salary x 15 x Number of years of service) / 26
Where:
- Last drawn salary = Basic wages + Dearness Allowance (DA)
- 15 = days of wages for each completed year of service
- 26 = working days in a month
- Service period of more than 6 months is rounded up to the next full year
Example: If last drawn salary (Basic + DA) = Rs. 30,000, and years of service = 10
Gratuity = (30,000 x 15 x 10) / 26 = Rs. 1,73,077

For piece-rated employees: Gratuity is calculated on the basis of average of total wages received during the last 3 months preceding termination.

5. MAXIMUM LIMIT
(a) Maximum gratuity payable: Rs. 25,00,000 (Twenty-Five Lakhs)
(b) This limit was enhanced from Rs. 20,00,000 to Rs. 25,00,000 vide notification S.O. 1420(E) dated 29.03.2024, effective from 29.03.2024
(c) The Payment of Gratuity (Amendment) Act, 2018 empowered the Central Government to enhance the ceiling through notification (without requiring Parliamentary amendment)
(d) Tax treatment: Gratuity received by government employees is fully exempt. For private sector employees, the least of the following is exempt under Section 10(10)(iii) of Income Tax Act: (i) actual gratuity received, (ii) Rs. 25,00,000, (iii) 15 days salary for each completed year of service

6. EVENTS TRIGGERING GRATUITY (Section 4(1))
Gratuity is payable on:
(a) Superannuation (retirement)
(b) Retirement
(c) Resignation (after 5 years of continuous service)
(d) Death (payable to nominee, no minimum service)
(e) Disablement due to accident or disease (no minimum service)
(f) Termination/retrenchment by employer
(g) Voluntary Retirement Scheme (VRS)

7. FORFEITURE (Section 4(6))
Gratuity may be forfeited wholly or partially if services are terminated for:
(a) Willful omission or negligence causing damage or loss to employer's property (forfeiture to the extent of damage/loss)
(b) Riotous or disorderly conduct or any act of violence
(c) Any act which constitutes an offence involving moral turpitude, provided the act is committed during the course of employment
Note: Forfeiture must be based on proved misconduct after due inquiry. Partial forfeiture is permissible proportionate to the damage caused.

8. NOMINATION (Section 6)
(a) Every employee shall make a nomination within 30 days of completing 1 year of service, or within 30 days of the Act becoming applicable
(b) Nomination to be filed in Form F (or online through employer portal)
(c) If the employee has a family, the nominee must be a family member
(d) Nomination can be modified at any time by the employee
(e) In case of death without nomination, gratuity is paid to the legal heir

9. PAYMENT TIMELINE (Section 7(3) and (3A))
(a) Gratuity shall be paid within 30 days of the date it becomes payable
(b) If not paid within 30 days, the employer shall pay simple interest at the rate notified by the Central Government (currently 10% per annum) from the date it becomes payable until actually paid
(c) Application for gratuity shall be made in Form I by the employee (or nominee in case of death) to the employer within 30 days of it becoming payable. However, delay in application does not forfeit the right.

10. CONTROLLING AUTHORITY
(a) The Controlling Authority for gratuity matters is the Assistant Labour Commissioner (Central) or the authority appointed by the State Government
(b) For Haryana: Deputy Labour Commissioner / Assistant Labour Commissioner, Gurugram
(c) Any dispute regarding gratuity shall be referred to the Controlling Authority for determination under Section 7(4)

11. EMPLOYER OBLIGATIONS
(a) Display abstract of the Act and Rules in Hindi and English at a conspicuous place (Section 4A)
(b) Maintain records: Gratuity register, nomination register
(c) Obtain and keep gratuity insurance policy or establish an approved gratuity fund (Section 4A) for establishments with 10+ employees
(d) Furnish nomination forms to all employees
(e) File annual return to the Controlling Authority

12. PENALTIES FOR NON-COMPLIANCE (Section 9)
(a) Failure to pay gratuity: Imprisonment of not less than 6 months extendable to 2 years (unless the court for adequate reasons orders lesser sentence not less than 3 months)
(b) For any other violation: Imprisonment up to 1 year and/or fine up to Rs. 20,000
(c) Making false statement to avoid payment: Imprisonment up to 6 months and/or fine up to Rs. 10,000

13. TRANSITION NOTE
The Code on Social Security, 2020 (Chapter XI) proposes to subsume the Payment of Gratuity Act. Proposed changes include: threshold reduced from 5 years to as notified, gratuity for fixed-term employees on pro-rata basis irrespective of 5-year completion. As of February 2026, the Code rules have not been notified for implementation.`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '2.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Payment of Gratuity Act, 1972 (Act 39 of 1972); Payment of Gratuity (Amendment) Act, 2018; S.O. 1420(E) dated 29.03.2024 (Rs. 25 lakh ceiling); Income Tax Act Section 10(10)(iii); Code on Social Security, 2020 (pending implementation)'
  },
  {
    policy_name: 'Maternity Benefit & Paternity Leave Policy',
    policy_number: 'HR-POL-010',
    category: 'Leave',
    description: 'Comprehensive maternity benefit policy as per Maternity Benefit (Amendment) Act 2017, including creche, work from home, nursing breaks, and paternity leave provisions',
    policy_content: `NAVODITA APPAREL - MATERNITY BENEFIT & PATERNITY LEAVE POLICY (Updated February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. LEGAL BASIS
(a) Maternity Benefit Act, 1961 (Act No. 53 of 1961) as amended by the Maternity Benefit (Amendment) Act, 2017 (Act No. 6 of 2017), effective from 01.04.2017
(b) Maternity Benefit (Amendment) Rules, 2017
(c) ESI Act, 1948 (for ESI-covered employees, maternity benefit under ESI Scheme)
(d) Code on Social Security, 2020 (Chapter VI on Maternity Benefit) - pending implementation

2. APPLICABILITY
(a) The Act applies to every establishment (factory, mine, plantation, shop, or establishment) employing 10 or more persons (Section 2)
(b) Applicable to all women employees irrespective of their designation - permanent, temporary, contractual, or casual
(c) For ESI-covered women employees: Maternity benefit is payable under the ESI scheme (not under the MB Act) unless the employer voluntarily provides benefits under the Act

3. MATERNITY LEAVE ENTITLEMENTS (Section 5)
(a) First two surviving children: Maximum 26 weeks of paid maternity leave
    - Pre-delivery leave: Up to 8 weeks before expected delivery date
    - Post-delivery leave: Remaining weeks after delivery
(b) Third child onwards: Maximum 12 weeks (6 weeks pre-delivery + 6 weeks post-delivery)
(c) Adoptive mother (child below 3 months of age): 12 weeks from the date of adoption (Section 5(4))
(d) Commissioning mother: 12 weeks from the date the child is handed over (Section 5(4))
(e) Miscarriage / Medical Termination of Pregnancy (MTP): 6 weeks immediately following the date of miscarriage or MTP (Section 9)
(f) Tubectomy operation: 2 weeks immediately following the date of tubectomy (Section 9A)
(g) Illness arising out of pregnancy, delivery, premature birth, miscarriage, MTP, or tubectomy: Additional 1 month of paid leave (Section 10)

4. ELIGIBILITY (Section 5(2))
(a) The woman must have actually worked for not less than 80 days in the 12 months immediately preceding the date of her expected delivery
(b) For calculating 80 days: Days of lay-off, leave with wages, and days she was absent due to any other leave are counted as days worked
(c) No minimum service period required beyond the 80-day work requirement

5. MATERNITY BENEFIT AMOUNT (Section 5(3))
(a) Average daily wage for the period of absence = total wages earned in the 3 months immediately preceding the date of leave / number of days worked in that period
(b) Payment: Full average daily wages for the entire maternity leave period
(c) Advance payment: For the period of 8 weeks prior to delivery and remaining period within 48 hours of production of proof of delivery (Section 6)
(d) Medical Bonus: Rs. 3,500 or as notified by the Central Government, if no pre-natal and post-natal care is provided free of charge by the employer (Section 8). Note: This amount may be revised by government notification; check latest notification.

6. WORK FROM HOME OPTION (Section 5(5))
(a) After the end of the 26-week maternity leave period, the woman employee and employer may mutually agree on a work-from-home arrangement
(b) This is subject to the nature of work assigned to the woman
(c) Terms and conditions of WFH to be mutually agreed upon
(d) The WFH facility may be availed for such period as mutually agreed

7. CRECHE FACILITY (Section 11A)
(a) Every establishment employing 50 or more employees shall provide a creche facility within a prescribed distance (either in the establishment or common facility)
(b) The woman employee shall be allowed 4 visits per day to the creche (including the interval for rest allowed to her)
(c) Navodita Apparel shall provide or arrange for creche facility as per the Act

8. NURSING BREAKS (Section 11)
(a) Every woman delivered of a child who returns to duty shall be allowed two nursing breaks of 15 minutes each in the course of her daily work
(b) This facility is available until the child attains the age of 15 months
(c) The nursing breaks are in addition to the regular rest intervals

9. EMPLOYER OBLIGATIONS AND PROHIBITIONS
(a) No discharge or dismissal during maternity leave or on account of absence due to pregnancy (Section 12)
(b) No reduction of wages or unfavorable change of conditions during maternity leave (Section 12)
(c) No deduction for absence due to maternity-related illness
(d) Employer must inform every woman employee at the time of her initial appointment about the maternity benefits available (Section 11A(2))
(e) Display abstract of the Act in conspicuous place at the workplace

10. PATERNITY LEAVE (Company Policy)
Note: There is no Central legislation mandating paternity leave for private sector employees in India as of February 2026. This is a Navodita Apparel company benefit.
(a) 15 working days of paid paternity leave
(b) Available within 6 months from the date of delivery/adoption
(c) Available for all confirmed male employees with at least 1 year of continuous service
(d) Application: Minimum 15 days advance notice (or as soon as practicable in case of premature delivery)
(e) Paternity leave is non-accumulative and non-encashable
(f) Cannot be combined with other leave types without prior approval

11. ESI MATERNITY BENEFIT (for ESI-covered employees)
(a) Maternity benefit under ESI: Full wages for 26 weeks (Section 50, ESI Act)
(b) Payable by ESIC, not the employer directly
(c) Eligibility: Minimum 70 days of contribution in two consecutive contribution periods
(d) Applicable even for miscarriage (6 weeks) and sickness arising from pregnancy (additional 1 month)
(e) Medical bonus: As per ESIC notification

12. PENALTIES FOR NON-COMPLIANCE (Section 21)
(a) Failure to pay maternity benefit: Imprisonment of not less than 3 months extendable to 1 year and fine of not less than Rs. 2,000 extendable to Rs. 5,000
(b) Dismissal or discharge during maternity leave: Imprisonment of not less than 3 months extendable to 1 year and fine of not less than Rs. 2,000 extendable to Rs. 5,000
(c) Inspector may direct payment of maternity benefit due

13. RECORDS AND REGISTERS
(a) Maintain Maternity Benefit Register (Form A)
(b) Muster Roll showing attendance of pregnant women
(c) Records of payment of maternity benefit
(d) Records to be maintained for at least 3 years

14. TRANSITION NOTE
The Code on Social Security, 2020 (Chapter VI) proposes to retain the key maternity benefit provisions including 26 weeks for first two children and 12 weeks for subsequent children. It also proposes maternity benefit for gig and platform workers through a social security fund. As of February 2026, the Code rules have not been notified for implementation.`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '2.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Maternity Benefit Act, 1961 (Act 53 of 1961); Maternity Benefit (Amendment) Act, 2017 (Act 6 of 2017); ESI Act, 1948 (Section 50); Code on Social Security, 2020 (Chapter VI, pending implementation)'
  },
  {
    policy_name: 'Occupational Safety, Health & Working Conditions Policy',
    policy_number: 'HR-POL-011',
    category: 'Safety',
    description: 'Workplace safety, health, and working conditions compliance as per Factories Act 1948, Building & Construction Workers Act, and OSH Code 2020 (pending implementation)',
    policy_content: `NAVODITA APPAREL - OCCUPATIONAL SAFETY, HEALTH & WORKING CONDITIONS POLICY (February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. LEGAL BASIS
(a) Factories Act, 1948 (Chapters III and IV - Health, Safety & Welfare)
(b) Haryana Factories Rules, 1950
(c) Occupational Safety, Health and Working Conditions Code, 2020 (Act No. 37 of 2020) - passed by Parliament on 22.09.2020, pending implementation
(d) Building and Other Construction Workers (Regulation of Employment and Conditions of Service) Act, 1996 (for any construction activity)
(e) Manufacture, Storage and Import of Hazardous Chemical Rules, 1989 (if applicable)

2. CURRENT STATUS OF OSH CODE 2020
(a) The Occupational Safety, Health and Working Conditions Code, 2020 proposes to subsume 13 existing labour laws including: Factories Act 1948, Mines Act 1952, Contract Labour Act 1970, Inter-State Migrant Workmen Act 1979, Building & Construction Workers Act 1996, and others
(b) Draft rules were published in November 2020. As of February 2026, the final rules have NOT been notified for implementation by the Central Government or Haryana State Government.
(c) Until the OSH Code is implemented, the existing Factories Act, 1948 and other current legislation continue to apply fully.

3. HEALTH PROVISIONS (Factories Act, Chapter III - Sections 11-20)
(a) Cleanliness: Factory premises to be kept clean, free from effluvia, and whitewashed/painted at prescribed intervals (Section 11)
(b) Ventilation and temperature: Adequate ventilation, comfortable temperature; measures to reduce dust, fumes (Section 13)
(c) Dust and fume prevention: Effective measures to prevent inhalation and accumulation (Section 14)
(d) Artificial humidification: Must comply with State rules (Section 15) - relevant for garment manufacturing
(e) Overcrowding: Minimum 14.2 cubic meters of space per worker (Section 16)
(f) Lighting: Sufficient and suitable natural/artificial lighting; prevention of glare (Section 17)
(g) Drinking water: Clean drinking water at convenient points, marked in Hindi and English (Section 18)
(h) Latrines and urinals: Adequate, separate for male and female workers, maintained in clean condition (Section 19)
(i) Spittoons: Provided at convenient places (Section 20)

4. SAFETY PROVISIONS (Factories Act, Chapter IV - Sections 21-41)
(a) Fencing of machinery: All dangerous parts of machinery must be securely fenced (Section 21)
(b) Work on or near machinery in motion: Only trained adult male workers wearing tight-fitting clothing (Section 22)
(c) Employment prohibition on dangerous machines: No untrained person shall work at dangerous machines (Section 23)
(d) Self-acting machines: Precautions for traversing carriages (Section 24)
(e) Casing of new machinery: All gears, screws, projections must be enclosed (Section 25)
(f) Precautions against dangerous fumes and gases: No person shall enter confined space with dangerous fumes (Section 36)
(g) Precautions against fire: Means of escape, fire exits maintained, fire extinguishers provided (Section 38)
(h) Safety Officers: Mandatory appointment if 1000+ workers (Section 40B); Navodita Apparel may appoint a Safety Officer as best practice
(i) Safety Committee: Required for factories with 250+ workers (Section 41G)

5. WELFARE PROVISIONS (Factories Act, Chapter V - Sections 42-50)
(a) Washing facilities: Adequate and suitable (Section 42)
(b) Facilities for storing and drying clothing (Section 43)
(c) First aid: First aid boxes at the rate of 1 per 150 workers, readily accessible (Section 45). At least one trained first-aider per shift.
(d) Canteen: Required for 250+ workers (Section 46)
(e) Shelters, rest rooms, lunch rooms: Required for 150+ workers (Section 47)
(f) Creche: Required for 30+ women workers (Section 48)
(g) Welfare Officer: Required for 500+ workers (Section 49)

6. GARMENT INDUSTRY-SPECIFIC SAFETY MEASURES (Navodita Apparel)
(a) Needle guard protectors on all sewing machines
(b) Proper ergonomic seating for sewing operators
(c) Adequate lighting at workstations (minimum 300 lux at cutting tables, 500 lux at inspection areas)
(d) Dust extraction systems in cutting and fabric storage areas
(e) Fire safety: Fire extinguishers on every floor, fire exits marked with illuminated signs, fire drill every quarter
(f) Electrical safety: Regular inspection of wiring, generators, and machinery
(g) Boiler safety (if applicable): Compliance with Indian Boilers Act, 1923
(h) Chemical safety: Proper storage and labeling of chemicals used in washing/finishing

7. ACCIDENT REPORTING
(a) Fatal accident: Immediate telephonic intimation to Factory Inspector, followed by written notice in Form 18 within 4 hours (Haryana Factories Rules, Rule 104)
(b) Serious bodily injury: Notice within 12 hours
(c) Dangerous occurrence: Notice within 24 hours
(d) All accidents causing absence of 48+ hours to be reported
(e) Maintain Accident Register in Form 17

8. PENALTIES (Factories Act, Section 92-96)
(a) General penalty for contravention: Imprisonment up to 2 years and/or fine up to Rs. 2,00,000 (Section 92)
(b) Continued contravention: Additional fine up to Rs. 1,000 per day
(c) Fatal accident due to contravention: Imprisonment up to 2 years (minimum 6 months) and fine up to Rs. 2,00,000 (Section 92-A)
(d) Occupier and Manager both liable (Section 92)

9. KEY PROPOSED CHANGES UNDER OSH CODE 2020 (when implemented)
(a) Single license/registration for all establishments
(b) National Occupational Safety and Health Advisory Board
(c) Mandatory appointment of Safety Officer for factories with 500+ workers (reduced from 1000)
(d) Free annual health checkup for workers above 14 years
(e) Appointment letter mandatory for all workers
(f) Maximum work hours: 8 hours per day (vs. current 9 hours under Factories Act)
(g) Women workers allowed in all establishments and shifts (with consent and safety provisions)
(h) Inter-state migrant workers: toll-free helpline, annual journey allowance

10. EMPLOYER COMPLIANCE CHECKLIST
- [ ] Factory license renewed annually with Haryana Factories Department
- [ ] Safety Officer appointed (if applicable)
- [ ] Fire safety equipment inspected quarterly
- [ ] First aid boxes stocked and accessible
- [ ] Annual health check-up arranged
- [ ] Safety audit conducted annually
- [ ] Accident register maintained and updated
- [ ] Safety signage displayed in Hindi and English
- [ ] PPE provided to workers in cutting, pressing, and washing sections`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '1.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Factories Act, 1948 (Chapters III, IV, V); Haryana Factories Rules, 1950; Occupational Safety, Health and Working Conditions Code, 2020 (Act 37 of 2020, pending implementation); Building and Other Construction Workers Act, 1996'
  },
  {
    policy_name: 'Payment of Bonus Policy',
    policy_number: 'HR-POL-012',
    category: 'Bonus',
    description: 'Statutory bonus compliance as per Payment of Bonus Act 1965, minimum and maximum bonus rates, eligibility, and computation for Navodita Apparel',
    policy_content: `NAVODITA APPAREL - PAYMENT OF BONUS POLICY (February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. LEGAL BASIS
(a) Payment of Bonus Act, 1965 (Act No. 21 of 1965)
(b) Payment of Bonus Rules, 1975
(c) Payment of Bonus (Amendment) Act, 2015 (effective 01.04.2014)
(d) The Code on Wages, 2019 (Chapter V on Bonus) - pending implementation

2. APPLICABILITY (Section 1(3))
(a) Applicable to every factory and every establishment employing 20 or more persons on any day during an accounting year
(b) Once applicable, continues to apply even if the number falls below 20
(c) Navodita Apparel, being a garment manufacturing establishment, is covered under this Act

3. ELIGIBILITY (Section 8)
(a) Every employee who has worked for not less than 30 working days in the relevant accounting year is eligible for bonus
(b) "Employee" for bonus purposes: Any person (other than an apprentice) employed on a salary or wage not exceeding Rs. 21,000 per month (enhanced from Rs. 10,000 vide Amendment Act, 2015, effective 01.04.2014)
(c) Employees drawing salary above Rs. 21,000/month are not entitled to statutory bonus but may receive ex-gratia bonus at management discretion

4. MINIMUM AND MAXIMUM BONUS (Sections 10, 11)
(a) Minimum Bonus: 8.33% of the salary/wage earned during the accounting year, or Rs. 100, whichever is higher (Section 10)
(b) Minimum bonus is payable irrespective of whether the employer has allocable surplus or not
(c) Maximum Bonus: 20% of the salary/wage earned during the accounting year (Section 11)
(d) In years of sufficient allocable surplus, bonus may be between 8.33% and 20%

5. CALCULATION CEILING (Section 12)
(a) For the purpose of computing bonus, if an employee's salary exceeds Rs. 7,000 per month (or minimum wage whichever is higher), the bonus shall be calculated on Rs. 7,000 per month or the minimum wage for the scheduled employment whichever is higher (Section 12)
(b) This ceiling was enhanced from Rs. 3,500 to Rs. 7,000 vide Amendment Act, 2015

6. COMPUTATION OF BONUS
(a) Gross Profit computed as per First Schedule (for banking companies) or Second Schedule (for other establishments)
(b) Available Surplus = Gross Profit - Depreciation - Direct Taxes - Sums specified in Section 6
(c) Allocable Surplus = 67% of Available Surplus (for companies other than banking) or 60% (for banking companies)
(d) Set-on and Set-off: Excess allocable surplus can be carried forward (set-on) for up to 4 years; deficit can be carried forward (set-off) for up to 4 years

7. PAYMENT TIMELINE (Section 19)
(a) Bonus shall be paid within 8 months from the close of the accounting year
(b) For Navodita Apparel (FY April-March): Bonus must be paid by 30th November of the same year
(c) Extension: The appropriate Government may, on sufficient cause, extend the time limit to 2 years

8. DISQUALIFICATION (Section 9)
An employee shall be disqualified from receiving bonus if dismissed for:
(a) Fraud
(b) Riotous or violent behaviour while on the premises
(c) Theft, misappropriation, or sabotage of any property of the establishment

9. RECORDS AND REGISTERS
(a) Register of bonus paid in Form A (Rule 4)
(b) Register of allocable surplus in Form B (Rule 4)
(c) Register of set-on and set-off in Form C (Rule 4)
(d) Annual return in Form D to the Inspector within 30 days of payment of bonus (Rule 5)
(e) All registers maintained for at least 8 years

10. PENALTIES (Section 28)
(a) Contravention of any provision: Imprisonment up to 6 months and/or fine up to Rs. 1,000
(b) Failure to pay bonus: Same penalty as above
(c) The Code on Wages, 2019 proposes enhanced penalties: Fine up to Rs. 50,000 for first offence; Rs. 1,00,000 and/or imprisonment up to 3 months for subsequent offences

11. CODE ON WAGES, 2019 - BONUS PROVISIONS (pending implementation)
(a) Chapter V of the Code on Wages retains the existing bonus framework
(b) Proposed changes: Government empowered to revise eligibility ceiling and calculation ceiling through notification (without Parliamentary amendment)
(c) As of February 2026, the Code has not been notified for implementation`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '1.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Payment of Bonus Act, 1965 (Act 21 of 1965); Payment of Bonus (Amendment) Act, 2015; Payment of Bonus Rules, 1975; Code on Wages, 2019 (Chapter V, pending implementation)'
  },
  {
    policy_name: 'Haryana Shops & Commercial Establishments Compliance Policy',
    policy_number: 'HR-POL-013',
    category: 'Compliance',
    description: 'Compliance with Haryana Shops and Commercial Establishments Act 1958 covering registration, working hours, holidays, leave, and employment conditions for Gurgaon establishment',
    policy_content: `NAVODITA APPAREL - HARYANA SHOPS & ESTABLISHMENTS ACT COMPLIANCE (February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001
Registration No.: [To be filled - registration under Haryana Shops & Establishments Act]

1. LEGAL BASIS
(a) Haryana Shops and Commercial Establishments Act, 1958 (Punjab Act No. 15 of 1958 as adopted by Haryana)
(b) Haryana Shops and Commercial Establishments Rules, 1965
(c) Applicable to all shops and commercial establishments in Haryana (office/showroom/commercial premises of Navodita Apparel)
Note: Factory/manufacturing operations are governed by the Factories Act, 1948. This policy covers the commercial/office establishment of Navodita Apparel.

2. REGISTRATION (Section 4)
(a) Every shop/establishment shall be registered within 30 days of commencement of business
(b) Application in prescribed form to the Registering Authority (designated by Haryana Government)
(c) Registration certificate must be displayed at the establishment
(d) Renewal as per Haryana Government rules
(e) Online registration available through Haryana SARAL portal (saralharyana.gov.in)

3. OPENING AND CLOSING HOURS (Sections 5-6)
(a) No shop shall open before 7:00 AM or remain open after 9:00 PM on any day (Section 5)
(b) No commercial establishment shall open before 9:00 AM or remain open after 7:00 PM (Section 6)
(c) Exemptions: State Government may grant exemptions for specific classes of establishments
(d) Haryana Government has granted extended hours for IT/ITES establishments

4. WORKING HOURS (Section 7-9)
(a) Maximum working hours: 9 hours per day, 48 hours per week (Section 7)
(b) Spread-over: Not exceeding 11 hours (Section 8)
(c) Overtime: Permitted with double the normal rate of wages (Section 9)
(d) Rest interval: At least 30 minutes after 5 hours of continuous work

5. WEEKLY HOLIDAYS (Section 10)
(a) Every employee entitled to one whole day as weekly holiday (normally Sunday)
(b) Employees in shops: One and a half days holiday per week (half-day on a weekday + full day Sunday) (Section 10)
(c) Alternative weekly holiday may be substituted with prior notice

6. LEAVE PROVISIONS (Sections 14-18)
(a) Earned Leave: 1 day for every 20 days of work (approximately 15 days per year) after 240 days of continuous service (Section 15)
(b) Accumulation: Up to 45 days
(c) Sick Leave: As per establishment rules (minimum standards under the Act)
(d) Leave with wages shall not be refused if applied with proper notice and balance available

7. EMPLOYMENT OF CHILDREN AND YOUNG PERSONS
(a) No child under 14 years shall be employed (Section 24)
(b) Young persons (14-18): Maximum 6 hours per day, no work between 7 PM and 8 AM

8. EMPLOYMENT OF WOMEN (Section 25-25A)
(a) No woman shall be required to work in any establishment between 8 PM and 6 AM
(b) Exception: Haryana Government may grant exemption for specific industries (IT/ITES, export-oriented units) subject to safety conditions including:
   - Company-provided transportation
   - CCTV at workplace
   - Security personnel
   - Written consent of the woman employee

9. WAGES AND PAYMENT (Sections 20-22)
(a) Wages payable within 7 days of the end of the wage period (10 days for 1000+ employees)
(b) Payment through bank transfer mandatory
(c) Wage slip to be provided to every employee
(d) No unauthorized deductions

10. TERMINATION OF SERVICE (Section 30)
(a) 1 month notice or pay in lieu for employees with 3+ months of continuous service
(b) Retrenchment compensation as per Industrial Disputes Act if applicable
(c) Employer cannot terminate a woman employee during maternity leave

11. RECORDS AND REGISTERS
(a) Register of employees (Form A)
(b) Register of leave (Form C)
(c) Register of wages (Form F)
(d) Attendance register / muster roll
(e) Inspection book
(f) Annual return to the Inspector by 15th January each year

12. PENALTIES (Section 33)
(a) Violation of any provision: Fine up to Rs. 250 for first offence
(b) Subsequent offence: Fine up to Rs. 500
(c) Continued violation: Additional fine up to Rs. 50 per day
Note: The OSH Code, 2020 (when implemented) proposes significantly higher penalties

13. HARYANA GOVERNMENT ONLINE COMPLIANCE
(a) Registration and renewal through SARAL portal
(b) Self-certification scheme: Establishments can self-certify compliance under specific conditions
(c) Haryana Labour Department inspection schedule and compliance calendar available online`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '1.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Haryana Shops and Commercial Establishments Act, 1958 (Punjab Act 15 of 1958); Haryana Shops and Commercial Establishments Rules, 1965; OSH Code, 2020 (pending implementation)'
  },
  {
    policy_name: 'Contract Labour Regulation Policy',
    policy_number: 'HR-POL-014',
    category: 'Compliance',
    description: 'Contract labour engagement, registration, and compliance as per Contract Labour (Regulation and Abolition) Act 1970 and Haryana Contract Labour Rules',
    policy_content: `NAVODITA APPAREL - CONTRACT LABOUR REGULATION POLICY (February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. LEGAL BASIS
(a) Contract Labour (Regulation and Abolition) Act, 1970 (Act No. 37 of 1970)
(b) Contract Labour (Regulation and Abolition) Central Rules, 1971
(c) Haryana Contract Labour (Regulation and Abolition) Rules, 1975
(d) The Occupational Safety, Health and Working Conditions Code, 2020 (Chapter XII on Contract Labour) - pending implementation

2. APPLICABILITY (Section 1(4))
(a) The Act applies to every establishment employing 20 or more contract workers on any day in the preceding 12 months
(b) It also applies to every contractor employing 20 or more contract workers on any day of the preceding 12 months
(c) Navodita Apparel, as a principal employer, must comply when engaging contractors with 20+ contract workers

3. REGISTRATION OF PRINCIPAL EMPLOYER (Section 7)
(a) Principal employer must obtain a Certificate of Registration from the Registering Officer (Deputy Labour Commissioner, Haryana)
(b) Application in Form I with prescribed fee
(c) Registration certificate (Form II) to be displayed at the establishment
(d) Validity: Until revoked; changes in particulars to be notified within 30 days

4. LICENSING OF CONTRACTORS (Section 12)
(a) No contractor shall undertake or execute contract work without a license (Form V)
(b) License application by contractor in Form IV to the Licensing Officer
(c) License valid for the period specified (usually 12 months), renewable
(d) Navodita Apparel must ensure all engaged contractors hold valid licenses
(e) License conditions include: payment of wages not below minimum wages, health and safety provisions, weekly rest days

5. OBLIGATIONS OF PRINCIPAL EMPLOYER (NAVODITA APPAREL)
(a) Ensure contractor pays minimum wages and statutory benefits to contract workers (Section 20-21)
(b) If contractor fails to pay wages within the prescribed period, the principal employer is liable to pay (Section 21)
(c) Provide canteen facility if 100+ contract workers are employed for 6+ months (Rule 40)
(d) Provide rest rooms if contract workers are required to halt at night (Rule 41)
(e) Provide adequate supply of drinking water (Rule 42)
(f) Provide latrines and urinals - separate for men and women (Rule 43-44)
(g) Provide washing facilities (Rule 45)
(h) Provide first aid - one first aid box per 150 workers (Rule 46)

6. OBLIGATIONS OF CONTRACTOR
(a) Pay wages directly to contract workers (not through any agent) (Section 21(1))
(b) Payment shall be made in the presence of the principal employer's representative (Section 21(3))
(c) Maintain registers and records: Muster Roll (Form XVI), Register of Wages (Form XVII), Register of Deductions (Form XX), Register of Overtime (Form XXIII), Register of Fines (Form XXI)
(d) Issue wage slips in Form XIX
(e) Deposit PF and ESI contributions for eligible contract workers

7. CONTRACT WORKER RIGHTS
(a) Minimum wages as per the scheduled employment notification for Haryana
(b) Working hours, rest intervals, and weekly holidays as per Factories Act or Shops & Establishments Act
(c) PF and ESI benefits if eligible
(d) Equal pay for equal work (as per Equal Remuneration Act)
(e) Safety measures and PPE at the workplace
(f) No engagement of child labour (below 14 years)

8. ABOLITION OF CONTRACT LABOUR (Section 10)
(a) The appropriate Government may prohibit contract labour in any process, operation, or work in any establishment by notification
(b) Factors considered: conditions of work, wages, whether the work is incidental to or necessary for the industry
(c) If contract labour is abolished, the principal employer must absorb contract workers or provide alternative employment

9. PENALTIES (Section 23-25)
(a) Contravention by principal employer (failure to register): Imprisonment up to 3 months and/or fine up to Rs. 1,000 (Section 23)
(b) Contravention by contractor (operating without license): Imprisonment up to 3 months and/or fine up to Rs. 1,000 (Section 23)
(c) Repeated offence: Imprisonment up to 6 months and fine
(d) Obstruction of Inspector: Imprisonment up to 3 months and/or fine up to Rs. 500

10. COMPLIANCE CHECKLIST
- [ ] Registration certificate of principal employer obtained and displayed
- [ ] All contractors verified for valid licenses before engagement
- [ ] Monthly wage payment verification of contract workers conducted
- [ ] PF and ESI compliance of contractors verified monthly
- [ ] Registers and records maintained by contractors verified quarterly
- [ ] Health, safety, and welfare facilities verified
- [ ] Half-yearly return in Form XXV filed by contractor
- [ ] Annual return filed by principal employer

11. OSH CODE 2020 - PROPOSED CHANGES (pending implementation)
(a) Threshold for applicability proposed to be raised to 50 workers (from 20)
(b) Single license for contractors operating across multiple states
(c) Digital compliance through Shram Suvidha Portal
(d) Enhanced penalties for non-compliance`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '1.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Contract Labour (Regulation and Abolition) Act, 1970 (Act 37 of 1970); Haryana Contract Labour Rules, 1975; Contract Labour (Central) Rules, 1971; OSH Code, 2020 (Chapter XII, pending implementation)'
  },
  {
    policy_name: 'Child Labour Prohibition & Adolescent Workers Policy',
    policy_number: 'HR-POL-015',
    category: 'Compliance',
    description: 'Prohibition of child labour and regulation of adolescent workers as per Child and Adolescent Labour (Prohibition and Regulation) Act 1986 (amended 2016)',
    policy_content: `NAVODITA APPAREL - CHILD LABOUR PROHIBITION POLICY (February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. LEGAL BASIS
(a) The Child and Adolescent Labour (Prohibition and Regulation) Act, 1986 (Act No. 61 of 1986), as amended by the Child and Adolescent Labour (Prohibition and Regulation) Amendment Act, 2016
(b) Child and Adolescent Labour (Prohibition and Regulation) Rules, 2017
(c) Factories Act, 1948 (Sections 67-77 - Employment of Young Persons)
(d) Right of Children to Free and Compulsory Education Act, 2009 (RTE Act)
(e) Constitution of India - Article 24 (Prohibition of employment of children in factories, mines, and other hazardous employment)
(f) Article 21A (Right to Education as a Fundamental Right)

2. DEFINITIONS
(a) Child: A person who has not completed 14 years of age (Section 2(ii))
(b) Adolescent: A person who has completed 14 years but not completed 18 years of age (Section 2(i))

3. ABSOLUTE PROHIBITION - CHILD LABOUR
(a) NO CHILD (below 14 years) shall be employed or permitted to work in ANY establishment including factories, workshops, shops, or commercial establishments (Section 3)
(b) This prohibition is ABSOLUTE for Navodita Apparel - no child labour in any form including garment manufacturing, packing, cleaning, or any other activity
(c) The 2016 Amendment removed the earlier exception for family-based enterprises/non-hazardous occupations during school hours - children below 14 cannot work in any occupation or process (except in family enterprises and audio-visual entertainment with conditions)
(d) This is a ZERO TOLERANCE policy at Navodita Apparel

4. REGULATION OF ADOLESCENT LABOUR (14-18 years)
(a) No adolescent shall be employed in any hazardous occupation or process as specified in the Schedule (Section 3A)
(b) Hazardous occupations/processes include: mines, inflammable substances, hazardous processes under Factories Act, and any process notified by the Central Government
(c) Garment manufacturing is NOT listed as a hazardous occupation; however, certain processes (chemical washing, pressing with industrial irons) may be hazardous
(d) If adolescents are employed in non-hazardous work:
    - Maximum 6 hours of work per day (including 1 hour rest)
    - No work between 7 PM and 8 AM
    - No overtime
    - At least one day off per week
    - Fitness certificate from authorized medical practitioner required

5. EMPLOYER OBLIGATIONS
(a) Verify age of every employee at the time of recruitment
(b) Acceptable age proof: Birth certificate, school leaving certificate, Aadhaar card, or certificate from a medical authority
(c) Maintain Register of Adolescent Workers in Form A (Rule 5)
(d) Display notice containing abstract of the Act at conspicuous place (Section 12)
(e) Health and safety measures for adolescent workers as prescribed
(f) No engagement of contract workers who are children
(g) Ensure supply chain compliance - no child labour at sub-contractor or vendor premises

6. SUPPLY CHAIN COMPLIANCE (Navodita Apparel Standard)
(a) All vendors, sub-contractors, and job-workers shall certify compliance with child labour laws
(b) Periodic audit of vendor/sub-contractor premises for child labour compliance
(c) Zero tolerance clause in all vendor contracts
(d) Immediate termination of contract upon discovery of child labour at vendor premises
(e) This is also a buyer/brand compliance requirement for garment export

7. PENALTIES (Section 14)
(a) Employment of a child in any occupation: Imprisonment of 6 months to 2 years and/or fine of Rs. 20,000 to Rs. 50,000 (Section 14(1))
(b) Repeat offence: Imprisonment of 1 to 3 years (Section 14(1) proviso)
(c) Employment of adolescent in hazardous occupation: Imprisonment of 6 months to 2 years and/or fine of Rs. 20,000 to Rs. 50,000 (Section 14(1A))
(d) Failure to comply with other provisions: Simple imprisonment up to 1 month and/or fine up to Rs. 10,000; repeat offence: imprisonment up to 6 months and/or fine up to Rs. 50,000 (Section 14(2))
(e) Parent/guardian who employs or permits a child to work: Fine up to Rs. 10,000 for first offence (Section 14(3)) - exception for poverty cases

8. REHABILITATION
(a) Children rescued from employment shall be rehabilitated as per the NCLP (National Child Labour Project) scheme
(b) Navodita Apparel shall cooperate with district authorities in rehabilitation efforts
(c) The Child and Adolescent Labour Fund created under the Act shall receive fines collected

9. COMPLIANCE AND MONITORING
- Age verification at recruitment (mandatory for all new hires)
- Annual self-audit of all work areas for child labour compliance
- Supplier/vendor audit checklist includes child labour verification
- Any employee or visitor may report suspected child labour to HR or management
- Whistleblower protection for persons reporting child labour violations`,
    effective_date: '2026-02-01',
    review_date: '2027-02-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '1.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Child and Adolescent Labour (Prohibition and Regulation) Act, 1986 (as amended 2016); CLPR Rules, 2017; Factories Act, 1948 (Sections 67-77); Constitution of India Articles 24, 21A, 39(e)(f); Right to Education Act, 2009'
  },
  {
    policy_name: 'New Labour Codes Implementation Readiness Policy',
    policy_number: 'HR-POL-016',
    category: 'Compliance',
    description: 'Implementation readiness for four new Labour Codes (Code on Wages 2019, Industrial Relations Code 2020, Social Security Code 2020, OSH Code 2020) with current status and transition plan',
    policy_content: `NAVODITA APPAREL - LABOUR CODES IMPLEMENTATION READINESS POLICY (February 2026)
Company: Navodita Apparel, Plot No.-255, Udhyog Vihar, Phase-VI, Sector 37, Gurgaon (HR) 122001

1. BACKGROUND
The Government of India has enacted four Labour Codes to consolidate, simplify, and rationalize 29 existing Central labour laws into 4 comprehensive codes. As of February 2026, all four Codes have been passed by Parliament and received Presidential assent, but the Central Government has NOT YET notified the appointed date for their implementation. Draft rules have been published but final rules are pending.

2. THE FOUR LABOUR CODES

A. CODE ON WAGES, 2019 (Act No. 29 of 2019)
- Presidential Assent: 08.08.2019
- Subsumes: Minimum Wages Act 1948, Payment of Wages Act 1936, Payment of Bonus Act 1965, Equal Remuneration Act 1976
- Key provisions:
  (i) Universal minimum wage applicable to all employments (not just scheduled employments)
  (ii) National Floor Wage to be fixed by Central Government (no state can fix minimum wage below this)
  (iii) Statutory definition of "wages" - at least 50% of total remuneration must be "wages" (basic + DA); other allowances capped at 50%
  (iv) This affects PF, ESI, gratuity, bonus calculations as they are based on "wages"
  (v) Payment of wages through bank account mandatory for all establishments
  (vi) Equal remuneration for equal work: no discrimination on ground of gender
  (vii) Enhanced penalties: Up to Rs. 50,000 for first offence; Rs. 1,00,000 and/or 3 months imprisonment for repeat offence

B. INDUSTRIAL RELATIONS CODE, 2020 (Act No. 35 of 2020)
- Presidential Assent: 28.09.2020
- Subsumes: Industrial Disputes Act 1947, Trade Unions Act 1926, Industrial Employment (Standing Orders) Act 1946
- Key provisions:
  (i) Standing Orders: Threshold raised from 100 to 300 workers (establishments below 300 workers will follow Model Standing Orders)
  (ii) Retrenchment/closure: Prior government permission required only for establishments with 300+ workers (raised from 100)
  (iii) Fixed-term employment: Recognized as a category - fixed-term employees entitled to same wages, hours, leave, and social security as permanent workers; gratuity payable on pro-rata basis even for service less than 5 years
  (iv) Strike/lock-out: 14 days notice required for all establishments (not just public utilities)
  (v) Re-skilling Fund: Retrenched workers entitled to 15 days wages from this fund
  (vi) Negotiating Union/Council: Recognition mechanism for trade unions as negotiating agents
  (vii) Grievance Redressal Committee: Mandatory for establishments with 20+ workers

C. CODE ON SOCIAL SECURITY, 2020 (Act No. 36 of 2020)
- Presidential Assent: 28.09.2020
- Subsumes: ESI Act 1948, EPF & MP Act 1952, Payment of Gratuity Act 1972, Maternity Benefit Act 1961, Employees Compensation Act 1923, Unorganised Workers Social Security Act 2008, Building & Construction Workers Cess Act 1996, Employment Exchanges Act 1959, and Cine Workers Welfare Fund Act 1981
- Key provisions:
  (i) Social Security Fund for unorganised workers, gig workers, and platform workers
  (ii) Central Government may notify schemes for gig and platform workers (Uber, Zomato, etc.)
  (iii) Employer contributions to social security may include contributions for gig/platform workers
  (iv) ESI and EPF: May be extended to all establishments (threshold to be notified)
  (v) Gratuity: Fixed-term employees eligible for pro-rata gratuity (no 5-year requirement)
  (vi) Aadhaar mandatory for social security registration
  (vii) Career Centres: Registration through career centres for employment services

D. OCCUPATIONAL SAFETY, HEALTH AND WORKING CONDITIONS CODE, 2020 (Act No. 37 of 2020)
- Presidential Assent: 28.09.2020
- Subsumes: Factories Act 1948, Mines Act 1952, Dock Workers Act 1986, Contract Labour Act 1970, Inter-State Migrant Workmen Act 1979, Building & Construction Workers Act 1996, and 7 other Acts
- Key provisions:
  (i) Single registration/license for all establishments (replacing multiple registrations)
  (ii) Women allowed to work in all establishments including night shifts (with consent and safety)
  (iii) Working hours: Maximum 8 hours per day (reduced from 9 under Factories Act)
  (iv) Overtime limit: As prescribed (proposed 125 hours per quarter in draft rules)
  (v) Contract labour threshold: 50 workers (raised from 20)
  (vi) Inter-state migrant workers: toll-free helpline, one-time travel allowance
  (vii) Appointment letter mandatory for every worker
  (viii) Annual health check-up free of charge for workers above 14 years
  (ix) National Occupational Safety and Health Advisory Board

3. CURRENT STATUS (February 2026)
(a) All four Codes have been enacted by Parliament
(b) Draft Central Rules for all four Codes were published for public comments (2020-2021)
(c) Several states including Uttar Pradesh, Madhya Pradesh, Karnataka, Uttarakhand, and others have published draft state rules
(d) Haryana State: Draft rules for some Codes have been published. Final rules NOT yet notified.
(e) The Central Government has NOT notified the appointed date for implementation of any of the four Codes
(f) EXISTING LAWS CONTINUE TO APPLY in full force until the Codes are officially implemented

4. IMPACT ON NAVODITA APPAREL - KEY CHANGES TO PREPARE FOR
(a) Wages restructuring: Ensure "wages" component (basic + DA) is at least 50% of CTC. This may increase employer's contribution to PF, ESI, gratuity, and bonus.
(b) Fixed-term employment: Prepare contracts for fixed-term workers with same benefits as permanent workers
(c) Standing Orders: If workforce below 300, Model Standing Orders will apply automatically
(d) Night shifts for women: Update POSH and safety policies to accommodate women in all shifts
(e) Contract labour: If threshold raised to 50, review contract worker engagement
(f) Social security for gig workers: If applicable, plan for contributions
(g) Single registration: Prepare for unified registration process
(h) Appointment letters: Ensure every worker (including temporary) has a formal appointment letter

5. TRANSITION PLAN
Phase 1 (Immediate):
- Audit current CTC structures for wages definition compliance
- Ensure all workers have appointment letters
- Review contract labour registers

Phase 2 (Upon notification of implementation date):
- Restructure salary components to comply with wages definition
- Update payroll system for new contribution calculations
- Revise employment contracts and standing orders
- Update HR policies to reference new Code provisions
- Train HR team and management on new Code requirements

Phase 3 (Post-implementation):
- File new registrations as required
- Update all statutory returns to new formats
- Ensure compliance with new penalties framework

6. MONITORING
(a) HR Department shall monitor government notifications weekly for any announcement regarding Labour Codes implementation
(b) Sources: Ministry of Labour & Employment website (labour.gov.in), Haryana Labour Department (hrylabour.gov.in), Gazette of India notifications
(c) Legal counsel to be engaged for interpretation of final rules when published
(d) This policy shall be updated within 30 days of any official notification regarding Labour Codes implementation`,
    effective_date: '2026-02-01',
    review_date: '2026-08-01',
    applicable_to: 'All Employees',
    status: 'Active',
    version: '1.0',
    approved_by: 'Management - Navodita Apparel',
    is_mandatory: true,
    legal_reference: 'Code on Wages, 2019 (Act 29 of 2019); Industrial Relations Code, 2020 (Act 35 of 2020); Code on Social Security, 2020 (Act 36 of 2020); Occupational Safety, Health and Working Conditions Code, 2020 (Act 37 of 2020) - ALL PENDING IMPLEMENTATION'
  },
];

const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'asc', category, status, is_mandatory } = req.query;
    const offset = (page - 1) * limit;
    let query = db('hr_policies').select('*');
    if (category) query = query.where('category', category);
    if (status) query = query.where('status', status);
    if (is_mandatory !== undefined) query = query.where('is_mandatory', is_mandatory === 'true');
    if (search) {
      query = query.where(function () {
        this.where('policy_name', 'ilike', `%${search}%`)
          .orWhere('policy_number', 'ilike', `%${search}%`)
          .orWhere('category', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`);
      });
    }
    const [{ count }] = await query.clone().clearSelect().count('id');
    const data = await query
      .orderBy(sort_by || 'policy_number', sort_order)
      .limit(limit).offset(offset);
    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const row = await db('hr_policies').where({ id: req.params.id }).first();
    if (!row) return res.status(404).json({ error: 'Policy not found' });
    res.json({ data: row });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.policy_name || !data.category || !data.policy_content) {
      return res.status(400).json({ error: 'Policy name, category, and content are required' });
    }
    const [row] = await db('hr_policies').insert(data).returning('*');
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const existing = await db('hr_policies').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Policy not found' });
    const data = req.body;
    data.updated_at = new Date();
    const [row] = await db('hr_policies').where({ id: req.params.id }).update(data).returning('*');
    res.json({ data: row });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const existing = await db('hr_policies').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Policy not found' });
    await db('hr_policies').where({ id: req.params.id }).del();
    res.json({ message: 'Policy deleted successfully' });
  } catch (err) { next(err); }
};

const seed = async (req, res, next) => {
  try {
    let inserted = 0;
    let updated = 0;
    for (const policy of DEFAULT_POLICIES) {
      const existing = await db('hr_policies').where('policy_number', policy.policy_number).first();
      if (!existing) {
        await db('hr_policies').insert(policy);
        inserted++;
      } else if (existing.version !== policy.version) {
        await db('hr_policies').where('policy_number', policy.policy_number).update({
          ...policy,
          updated_at: db.fn.now(),
        });
        updated++;
      }
    }
    const [{ count }] = await db('hr_policies').count();
    res.json({
      message: `HR policies seeded: ${inserted} inserted, ${updated} updated`,
      count: parseInt(count),
      total_default: DEFAULT_POLICIES.length,
    });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove, seed };
