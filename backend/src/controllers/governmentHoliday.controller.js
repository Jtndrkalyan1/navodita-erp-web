const db = require('../config/database');

// Fixed national holidays (dates don't change year to year)
const FIXED_NATIONAL_HOLIDAYS = [
  { holiday_name: 'New Year Day', holiday_type: 'Optional', description: 'New Year celebration', mmdd: '01-01' },
  { holiday_name: 'Makar Sankranti / Lohri', holiday_type: 'Restricted', description: 'Harvest festival - Lohri/Makar Sankranti in Haryana', mmdd: '01-14' },
  { holiday_name: 'Republic Day', holiday_type: 'Gazetted', description: 'National holiday celebrating the adoption of the Constitution of India', mmdd: '01-26' },
  { holiday_name: 'Dr. Ambedkar Jayanti', holiday_type: 'Gazetted', description: 'Birth anniversary of Dr. B.R. Ambedkar - Father of Indian Constitution', mmdd: '04-14' },
  { holiday_name: 'May Day (Labour Day)', holiday_type: 'Gazetted', description: 'International Workers Day', mmdd: '05-01' },
  { holiday_name: 'Independence Day', holiday_type: 'Gazetted', description: 'National holiday celebrating Indian independence from British rule', mmdd: '08-15' },
  { holiday_name: 'Gandhi Jayanti', holiday_type: 'Gazetted', description: 'Birth anniversary of Mahatma Gandhi - Father of the Nation', mmdd: '10-02' },
  { holiday_name: 'Haryana Day', holiday_type: 'Gazetted', description: 'State formation day - Haryana was carved out of Punjab on 1 Nov 1966', mmdd: '11-01' },
  { holiday_name: 'Christmas', holiday_type: 'Gazetted', description: 'Christian holiday celebrating the birth of Jesus Christ', mmdd: '12-25' },
];

// Lunar/floating holidays by year (computed from lunar calendar)
// These vary year to year - stored separately
const FLOATING_HOLIDAYS_BY_YEAR = {
  2025: [
    { holiday_name: 'Maha Shivaratri', holiday_date: '2025-02-26', holiday_type: 'Gazetted', description: 'Hindu festival dedicated to Lord Shiva' },
    { holiday_name: 'Holi', holiday_date: '2025-03-14', holiday_type: 'Gazetted', description: 'Festival of colours - Phalgun Purnima' },
    { holiday_name: 'Ram Navami', holiday_date: '2025-04-06', holiday_type: 'Gazetted', description: 'Hindu festival celebrating the birth of Lord Rama' },
    { holiday_name: 'Mahavir Jayanti', holiday_date: '2025-04-10', holiday_type: 'Gazetted', description: 'Jain festival celebrating the birth of Lord Mahavira' },
    { holiday_name: 'Baisakhi', holiday_date: '2025-04-13', holiday_type: 'Gazetted', description: 'Harvest festival of Haryana - Sikh New Year' },
    { holiday_name: 'Good Friday', holiday_date: '2025-04-18', holiday_type: 'Gazetted', description: 'Christian holiday commemorating the crucifixion of Jesus Christ' },
    { holiday_name: 'Eid ul-Fitr', holiday_date: '2025-03-31', holiday_type: 'Gazetted', description: 'Islamic festival marking the end of Ramadan' },
    { holiday_name: 'Buddha Purnima', holiday_date: '2025-05-12', holiday_type: 'Gazetted', description: 'Buddhist festival celebrating the birth of Gautama Buddha' },
    { holiday_name: 'Eid ul-Adha (Bakrid)', holiday_date: '2025-06-07', holiday_type: 'Gazetted', description: 'Islamic festival of sacrifice' },
    { holiday_name: 'Muharram (Ashura)', holiday_date: '2025-07-06', holiday_type: 'Gazetted', description: 'Islamic New Year - 10th day of Muharram' },
    { holiday_name: 'Raksha Bandhan', holiday_date: '2025-08-09', holiday_type: 'Restricted', description: 'Festival celebrating the bond between brothers and sisters' },
    { holiday_name: 'Janmashtami', holiday_date: '2025-08-16', holiday_type: 'Gazetted', description: 'Hindu festival celebrating the birth of Lord Krishna' },
    { holiday_name: 'Milad-un-Nabi', holiday_date: '2025-09-05', holiday_type: 'Gazetted', description: 'Birthday of Prophet Muhammad' },
    { holiday_name: 'Navratri (Start)', holiday_date: '2025-09-22', holiday_type: 'Restricted', description: 'Nine nights festival dedicated to Goddess Durga begins' },
    { holiday_name: 'Dussehra (Vijaya Dashami)', holiday_date: '2025-10-02', holiday_type: 'Gazetted', description: 'Hindu festival celebrating victory of Lord Rama over Ravana' },
    { holiday_name: 'Diwali (Deepawali)', holiday_date: '2025-10-20', holiday_type: 'Gazetted', description: 'Festival of lights - one of the most important Hindu festivals' },
    { holiday_name: 'Govardhan Puja', holiday_date: '2025-10-21', holiday_type: 'Restricted', description: 'Day after Diwali - worshipping Govardhan hill' },
    { holiday_name: 'Guru Nanak Jayanti (Gurpurab)', holiday_date: '2025-11-05', holiday_type: 'Gazetted', description: 'Birth anniversary of Guru Nanak Dev Ji, founder of Sikhism' },
  ],
  2026: [
    { holiday_name: 'Maha Shivaratri', holiday_date: '2026-02-15', holiday_type: 'Gazetted', description: 'Hindu festival dedicated to Lord Shiva' },
    { holiday_name: 'Holi', holiday_date: '2026-03-03', holiday_type: 'Gazetted', description: 'Festival of colours - Phalgun Purnima' },
    { holiday_name: 'Eid ul-Fitr', holiday_date: '2026-03-20', holiday_type: 'Gazetted', description: 'Islamic festival marking the end of Ramadan' },
    { holiday_name: 'Ram Navami', holiday_date: '2026-03-26', holiday_type: 'Gazetted', description: 'Hindu festival celebrating the birth of Lord Rama' },
    { holiday_name: 'Good Friday', holiday_date: '2026-04-03', holiday_type: 'Gazetted', description: 'Christian holiday commemorating the crucifixion of Jesus Christ' },
    { holiday_name: 'Baisakhi', holiday_date: '2026-04-13', holiday_type: 'Gazetted', description: 'Harvest festival of Haryana - Sikh New Year' },
    { holiday_name: 'Mahavir Jayanti', holiday_date: '2026-04-18', holiday_type: 'Gazetted', description: 'Jain festival celebrating the birth of Lord Mahavira' },
    { holiday_name: 'Eid ul-Adha (Bakrid)', holiday_date: '2026-05-27', holiday_type: 'Gazetted', description: 'Islamic festival of sacrifice' },
    { holiday_name: 'Buddha Purnima', holiday_date: '2026-05-31', holiday_type: 'Gazetted', description: 'Buddhist festival celebrating the birth of Gautama Buddha' },
    { holiday_name: 'Muharram (Ashura)', holiday_date: '2026-06-26', holiday_type: 'Gazetted', description: 'Islamic New Year - 10th day of Muharram' },
    { holiday_name: 'Milad-un-Nabi', holiday_date: '2026-08-25', holiday_type: 'Gazetted', description: 'Birthday of Prophet Muhammad' },
    { holiday_name: 'Raksha Bandhan', holiday_date: '2026-08-29', holiday_type: 'Restricted', description: 'Festival celebrating the bond between brothers and sisters' },
    { holiday_name: 'Janmashtami', holiday_date: '2026-09-05', holiday_type: 'Gazetted', description: 'Hindu festival celebrating the birth of Lord Krishna' },
    { holiday_name: 'Navratri (Start)', holiday_date: '2026-10-08', holiday_type: 'Restricted', description: 'Nine nights festival dedicated to Goddess Durga begins' },
    { holiday_name: 'Dussehra (Vijaya Dashami)', holiday_date: '2026-10-17', holiday_type: 'Gazetted', description: 'Hindu festival celebrating victory of Lord Rama over Ravana' },
    { holiday_name: 'Diwali (Deepawali)', holiday_date: '2026-11-08', holiday_type: 'Gazetted', description: 'Festival of lights - one of the most important Hindu festivals' },
    { holiday_name: 'Govardhan Puja', holiday_date: '2026-11-09', holiday_type: 'Restricted', description: 'Day after Diwali - worshipping Govardhan hill' },
    { holiday_name: 'Guru Nanak Jayanti (Gurpurab)', holiday_date: '2026-11-25', holiday_type: 'Gazetted', description: 'Birth anniversary of Guru Nanak Dev Ji, founder of Sikhism' },
  ],
  2027: [
    { holiday_name: 'Maha Shivaratri', holiday_date: '2027-03-06', holiday_type: 'Gazetted', description: 'Hindu festival dedicated to Lord Shiva' },
    { holiday_name: 'Holi', holiday_date: '2027-03-22', holiday_type: 'Gazetted', description: 'Festival of colours - Phalgun Purnima' },
    { holiday_name: 'Eid ul-Fitr', holiday_date: '2027-03-09', holiday_type: 'Gazetted', description: 'Islamic festival marking the end of Ramadan' },
    { holiday_name: 'Good Friday', holiday_date: '2027-03-26', holiday_type: 'Gazetted', description: 'Christian holiday commemorating the crucifixion of Jesus Christ' },
    { holiday_name: 'Ram Navami', holiday_date: '2027-04-14', holiday_type: 'Gazetted', description: 'Hindu festival celebrating the birth of Lord Rama' },
    { holiday_name: 'Baisakhi', holiday_date: '2027-04-13', holiday_type: 'Gazetted', description: 'Harvest festival of Haryana - Sikh New Year' },
    { holiday_name: 'Mahavir Jayanti', holiday_date: '2027-04-07', holiday_type: 'Gazetted', description: 'Jain festival celebrating the birth of Lord Mahavira' },
    { holiday_name: 'Eid ul-Adha (Bakrid)', holiday_date: '2027-05-17', holiday_type: 'Gazetted', description: 'Islamic festival of sacrifice' },
    { holiday_name: 'Buddha Purnima', holiday_date: '2027-05-20', holiday_type: 'Gazetted', description: 'Buddhist festival celebrating the birth of Gautama Buddha' },
    { holiday_name: 'Muharram (Ashura)', holiday_date: '2027-06-15', holiday_type: 'Gazetted', description: 'Islamic New Year - 10th day of Muharram' },
    { holiday_name: 'Milad-un-Nabi', holiday_date: '2027-08-14', holiday_type: 'Gazetted', description: 'Birthday of Prophet Muhammad' },
    { holiday_name: 'Raksha Bandhan', holiday_date: '2027-08-18', holiday_type: 'Restricted', description: 'Festival celebrating the bond between brothers and sisters' },
    { holiday_name: 'Janmashtami', holiday_date: '2027-08-25', holiday_type: 'Gazetted', description: 'Hindu festival celebrating the birth of Lord Krishna' },
    { holiday_name: 'Navratri (Start)', holiday_date: '2027-09-28', holiday_type: 'Restricted', description: 'Nine nights festival dedicated to Goddess Durga begins' },
    { holiday_name: 'Dussehra (Vijaya Dashami)', holiday_date: '2027-10-07', holiday_type: 'Gazetted', description: 'Hindu festival celebrating victory of Lord Rama over Ravana' },
    { holiday_name: 'Diwali (Deepawali)', holiday_date: '2027-10-27', holiday_type: 'Gazetted', description: 'Festival of lights - one of the most important Hindu festivals' },
    { holiday_name: 'Govardhan Puja', holiday_date: '2027-10-28', holiday_type: 'Restricted', description: 'Day after Diwali - worshipping Govardhan hill' },
    { holiday_name: 'Guru Nanak Jayanti (Gurpurab)', holiday_date: '2027-11-14', holiday_type: 'Gazetted', description: 'Birth anniversary of Guru Nanak Dev Ji, founder of Sikhism' },
  ],
  2028: [
    { holiday_name: 'Maha Shivaratri', holiday_date: '2028-02-23', holiday_type: 'Gazetted', description: 'Hindu festival dedicated to Lord Shiva' },
    { holiday_name: 'Holi', holiday_date: '2028-03-11', holiday_type: 'Gazetted', description: 'Festival of colours - Phalgun Purnima' },
    { holiday_name: 'Eid ul-Fitr', holiday_date: '2028-02-26', holiday_type: 'Gazetted', description: 'Islamic festival marking the end of Ramadan' },
    { holiday_name: 'Good Friday', holiday_date: '2028-04-14', holiday_type: 'Gazetted', description: 'Christian holiday commemorating the crucifixion of Jesus Christ' },
    { holiday_name: 'Baisakhi', holiday_date: '2028-04-13', holiday_type: 'Gazetted', description: 'Harvest festival of Haryana - Sikh New Year' },
    { holiday_name: 'Ram Navami', holiday_date: '2028-04-02', holiday_type: 'Gazetted', description: 'Hindu festival celebrating the birth of Lord Rama' },
    { holiday_name: 'Mahavir Jayanti', holiday_date: '2028-04-25', holiday_type: 'Gazetted', description: 'Jain festival celebrating the birth of Lord Mahavira' },
    { holiday_name: 'Eid ul-Adha (Bakrid)', holiday_date: '2028-05-05', holiday_type: 'Gazetted', description: 'Islamic festival of sacrifice' },
    { holiday_name: 'Buddha Purnima', holiday_date: '2028-05-30', holiday_type: 'Gazetted', description: 'Buddhist festival celebrating the birth of Gautama Buddha' },
    { holiday_name: 'Muharram (Ashura)', holiday_date: '2028-06-04', holiday_type: 'Gazetted', description: 'Islamic New Year - 10th day of Muharram' },
    { holiday_name: 'Raksha Bandhan', holiday_date: '2028-08-07', holiday_type: 'Restricted', description: 'Festival celebrating the bond between brothers and sisters' },
    { holiday_name: 'Janmashtami', holiday_date: '2028-08-13', holiday_type: 'Gazetted', description: 'Hindu festival celebrating the birth of Lord Krishna' },
    { holiday_name: 'Milad-un-Nabi', holiday_date: '2028-08-03', holiday_type: 'Gazetted', description: 'Birthday of Prophet Muhammad' },
    { holiday_name: 'Navratri (Start)', holiday_date: '2028-10-17', holiday_type: 'Restricted', description: 'Nine nights festival dedicated to Goddess Durga begins' },
    { holiday_name: 'Dussehra (Vijaya Dashami)', holiday_date: '2028-10-26', holiday_type: 'Gazetted', description: 'Hindu festival celebrating victory of Lord Rama over Ravana' },
    { holiday_name: 'Diwali (Deepawali)', holiday_date: '2028-11-14', holiday_type: 'Gazetted', description: 'Festival of lights - one of the most important Hindu festivals' },
    { holiday_name: 'Govardhan Puja', holiday_date: '2028-11-15', holiday_type: 'Restricted', description: 'Day after Diwali - worshipping Govardhan hill' },
    { holiday_name: 'Guru Nanak Jayanti (Gurpurab)', holiday_date: '2028-11-02', holiday_type: 'Gazetted', description: 'Birth anniversary of Guru Nanak Dev Ji, founder of Sikhism' },
  ],
};

// Helper: build full holiday list for a year (fixed + floating)
function buildHolidaysForYear(year) {
  const fixed = FIXED_NATIONAL_HOLIDAYS.map(h => ({
    holiday_name: h.holiday_name,
    holiday_date: `${year}-${h.mmdd}`,
    holiday_type: h.holiday_type,
    state: 'Haryana',
    year,
    description: h.description,
  }));
  const floating = (FLOATING_HOLIDAYS_BY_YEAR[year] || []).map(h => ({
    ...h,
    state: 'Haryana',
    year,
  }));
  return [...fixed, ...floating].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
}

// Accurate Haryana Government Holidays for 2025
const HARYANA_2025_HOLIDAYS = [
  { holiday_name: 'New Year Day', holiday_date: '2025-01-01', holiday_type: 'Optional', state: 'Haryana', year: 2025, description: 'New Year celebration' },
  { holiday_name: 'Makar Sankranti / Lohri', holiday_date: '2025-01-14', holiday_type: 'Restricted', state: 'Haryana', year: 2025, description: 'Harvest festival celebrated in North India, especially Punjab and Haryana' },
  { holiday_name: 'Republic Day', holiday_date: '2025-01-26', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'National holiday celebrating the adoption of the Constitution of India' },
  { holiday_name: 'Maha Shivaratri', holiday_date: '2025-02-26', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Hindu festival dedicated to Lord Shiva' },
  { holiday_name: 'Holi', holiday_date: '2025-03-14', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Festival of colours celebrating the arrival of spring' },
  { holiday_name: 'Good Friday', holiday_date: '2025-04-18', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Christian holiday commemorating the crucifixion of Jesus Christ' },
  { holiday_name: 'Ram Navami', holiday_date: '2025-04-06', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Hindu festival celebrating the birth of Lord Rama' },
  { holiday_name: 'Mahavir Jayanti', holiday_date: '2025-04-10', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Jain festival celebrating the birth of Lord Mahavira' },
  { holiday_name: 'Baisakhi', holiday_date: '2025-04-13', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Harvest festival of Punjab and Haryana, also marks Sikh New Year' },
  { holiday_name: 'Dr. Ambedkar Jayanti', holiday_date: '2025-04-14', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Birth anniversary of Dr. B.R. Ambedkar' },
  { holiday_name: 'May Day (Labour Day)', holiday_date: '2025-05-01', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'International Workers Day' },
  { holiday_name: 'Buddha Purnima', holiday_date: '2025-05-12', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Buddhist festival celebrating the birth of Gautama Buddha' },
  { holiday_name: 'Eid ul-Adha (Bakrid)', holiday_date: '2025-06-07', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Islamic festival of sacrifice' },
  { holiday_name: 'Muharram (Ashura)', holiday_date: '2025-07-06', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Islamic New Year - 10th day of Muharram' },
  { holiday_name: 'Independence Day', holiday_date: '2025-08-15', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'National holiday celebrating Indian independence from British rule' },
  { holiday_name: 'Raksha Bandhan', holiday_date: '2025-08-09', holiday_type: 'Restricted', state: 'Haryana', year: 2025, description: 'Festival celebrating the bond between brothers and sisters' },
  { holiday_name: 'Janmashtami', holiday_date: '2025-08-16', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Hindu festival celebrating the birth of Lord Krishna' },
  { holiday_name: 'Milad-un-Nabi (Eid-e-Milad)', holiday_date: '2025-09-05', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Birthday of Prophet Muhammad' },
  { holiday_name: 'Gandhi Jayanti', holiday_date: '2025-10-02', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Birth anniversary of Mahatma Gandhi - Father of the Nation' },
  { holiday_name: 'Dussehra (Vijaya Dashami)', holiday_date: '2025-10-02', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Hindu festival celebrating victory of Lord Rama over Ravana' },
  { holiday_name: 'Diwali (Deepawali)', holiday_date: '2025-10-20', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Festival of lights - one of the most important Hindu festivals' },
  { holiday_name: 'Govardhan Puja', holiday_date: '2025-10-21', holiday_type: 'Restricted', state: 'Haryana', year: 2025, description: 'Day after Diwali - worshipping Govardhan hill' },
  { holiday_name: 'Haryana Day', holiday_date: '2025-11-01', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'State formation day - Haryana was carved out of Punjab on 1 Nov 1966' },
  { holiday_name: 'Guru Nanak Jayanti (Gurpurab)', holiday_date: '2025-11-05', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Birth anniversary of Guru Nanak Dev Ji, founder of Sikhism' },
  { holiday_name: 'Christmas', holiday_date: '2025-12-25', holiday_type: 'Gazetted', state: 'Haryana', year: 2025, description: 'Christian holiday celebrating the birth of Jesus Christ' },
];

// Accurate Haryana Government Holidays for 2026
const HARYANA_2026_HOLIDAYS = [
  { holiday_name: 'New Year Day', holiday_date: '2026-01-01', holiday_type: 'Optional', state: 'Haryana', year: 2026, description: 'New Year celebration' },
  { holiday_name: 'Makar Sankranti / Lohri', holiday_date: '2026-01-14', holiday_type: 'Restricted', state: 'Haryana', year: 2026, description: 'Harvest festival celebrated in North India, especially Punjab and Haryana' },
  { holiday_name: 'Republic Day', holiday_date: '2026-01-26', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'National holiday celebrating the adoption of the Constitution of India' },
  { holiday_name: 'Maha Shivaratri', holiday_date: '2026-02-15', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Hindu festival dedicated to Lord Shiva - falls on 13th day of dark fortnight in Phalguna' },
  { holiday_name: 'Holi', holiday_date: '2026-03-03', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Festival of colours celebrating the arrival of spring - Phalgun Purnima' },
  { holiday_name: 'Good Friday', holiday_date: '2026-04-03', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Christian holiday commemorating the crucifixion of Jesus Christ' },
  { holiday_name: 'Ram Navami', holiday_date: '2026-03-26', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Hindu festival celebrating the birth of Lord Rama' },
  { holiday_name: 'Eid ul-Fitr', holiday_date: '2026-03-20', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Islamic festival marking the end of Ramadan fasting month' },
  { holiday_name: 'Baisakhi', holiday_date: '2026-04-13', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Harvest festival of Punjab and Haryana, also marks Sikh New Year' },
  { holiday_name: 'Dr. Ambedkar Jayanti', holiday_date: '2026-04-14', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Birth anniversary of Dr. B.R. Ambedkar - Father of Indian Constitution' },
  { holiday_name: 'Mahavir Jayanti', holiday_date: '2026-04-18', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Jain festival celebrating the birth of Lord Mahavira' },
  { holiday_name: 'May Day (Labour Day)', holiday_date: '2026-05-01', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'International Workers Day' },
  { holiday_name: 'Buddha Purnima', holiday_date: '2026-05-31', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Buddhist festival celebrating the birth of Gautama Buddha' },
  { holiday_name: 'Eid ul-Adha (Bakrid)', holiday_date: '2026-05-27', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Islamic festival of sacrifice - Bakr Eid' },
  { holiday_name: 'Muharram (Ashura)', holiday_date: '2026-06-26', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Islamic New Year - 10th day of Muharram' },
  { holiday_name: 'Independence Day', holiday_date: '2026-08-15', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'National holiday celebrating 80 years of Indian independence from British rule' },
  { holiday_name: 'Raksha Bandhan', holiday_date: '2026-08-29', holiday_type: 'Restricted', state: 'Haryana', year: 2026, description: 'Festival celebrating the bond between brothers and sisters' },
  { holiday_name: 'Janmashtami', holiday_date: '2026-09-05', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Hindu festival celebrating the birth of Lord Krishna - Bhadra Ashtami' },
  { holiday_name: 'Milad-un-Nabi (Eid-e-Milad)', holiday_date: '2026-08-25', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Birthday of Prophet Muhammad' },
  { holiday_name: 'Gandhi Jayanti', holiday_date: '2026-10-02', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Birth anniversary of Mahatma Gandhi - Father of the Nation' },
  { holiday_name: 'Navratri (Start)', holiday_date: '2026-10-08', holiday_type: 'Restricted', state: 'Haryana', year: 2026, description: 'Nine nights festival dedicated to Goddess Durga begins' },
  { holiday_name: 'Dussehra (Vijaya Dashami)', holiday_date: '2026-10-17', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Hindu festival celebrating victory of Lord Rama over Ravana - 10th day after Navratri' },
  { holiday_name: 'Diwali (Deepawali)', holiday_date: '2026-11-08', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Festival of lights - one of the most important Hindu festivals' },
  { holiday_name: 'Govardhan Puja', holiday_date: '2026-11-09', holiday_type: 'Restricted', state: 'Haryana', year: 2026, description: 'Day after Diwali - worshipping Govardhan hill' },
  { holiday_name: 'Haryana Day', holiday_date: '2026-11-01', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'State formation day - Haryana was carved out of Punjab on 1 Nov 1966' },
  { holiday_name: 'Guru Nanak Jayanti (Gurpurab)', holiday_date: '2026-11-25', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Birth anniversary of Guru Nanak Dev Ji, founder of Sikhism' },
  { holiday_name: 'Christmas', holiday_date: '2026-12-25', holiday_type: 'Gazetted', state: 'Haryana', year: 2026, description: 'Christian holiday celebrating the birth of Jesus Christ' },
];

const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, search, sort_by, sort_order = 'asc', year, holiday_type, is_active } = req.query;
    const offset = (page - 1) * limit;
    let query = db('government_holidays').select('*');
    if (year) query = query.where('year', parseInt(year));
    if (holiday_type) query = query.where('holiday_type', holiday_type);
    if (is_active !== undefined) query = query.where('is_active', is_active === 'true');
    if (search) {
      query = query.where(function () {
        this.where('holiday_name', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`);
      });
    }
    const [{ count }] = await query.clone().clearSelect().count('id');
    const data = await query
      .orderBy(sort_by || 'holiday_date', sort_order)
      .limit(limit).offset(offset);
    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const row = await db('government_holidays').where({ id: req.params.id }).first();
    if (!row) return res.status(404).json({ error: 'Holiday not found' });
    res.json({ data: row });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.holiday_name || !data.holiday_date) {
      return res.status(400).json({ error: 'Holiday name and date are required' });
    }
    if (!data.year) data.year = new Date(data.holiday_date).getFullYear();
    const [row] = await db('government_holidays').insert(data).returning('*');
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const existing = await db('government_holidays').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Holiday not found' });
    const data = req.body;
    data.updated_at = new Date();
    const [row] = await db('government_holidays').where({ id: req.params.id }).update(data).returning('*');
    res.json({ data: row });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const existing = await db('government_holidays').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Holiday not found' });
    await db('government_holidays').where({ id: req.params.id }).del();
    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) { next(err); }
};

const seed = async (req, res, next) => {
  try {
    const targetYear = parseInt(req.query.year || req.body?.year || 2026);
    const holidays = buildHolidaysForYear(targetYear);

    // Delete existing holidays for this year and re-seed with accurate data
    await db('government_holidays').where({ year: targetYear, state: 'Haryana' }).del();
    await db('government_holidays').insert(holidays);

    res.status(201).json({
      message: `Haryana ${targetYear} holidays loaded successfully (${holidays.length} holidays)`,
      count: holidays.length
    });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove, seed };
