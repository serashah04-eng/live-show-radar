/** Cities across India, grouped by region so they are easy to pick instead of typed. */
export const INDIA_REGIONS: { region: string; cities: string[] }[] = [
  {
    region: "South",
    cities: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Vellore", "Thanjavur", "Puducherry", "Hyderabad", "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Rajahmundry", "Kakinada", "Tirupati", "Warangal", "Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kannur", "Kollam"],
  },
  { region: "West", cities: ["Mumbai", "Navi Mumbai", "Thane", "Pune", "Nagpur", "Nashik", "Aurangabad", "Kolhapur", "Solapur", "Goa", "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar"] },
  {
    region: "North",
    cities: ["Delhi", "Gurugram", "Noida", "Ghaziabad", "Faridabad", "Chandigarh", "Mohali", "Panchkula", "Amritsar", "Ludhiana", "Jalandhar", "Shimla", "Manali", "Dharamshala", "Dehradun", "Rishikesh", "Haridwar", "Jaipur", "Udaipur", "Jodhpur", "Ajmer", "Kota", "Bikaner", "Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Meerut", "Gorakhpur", "Srinagar", "Jammu", "Leh"],
  },
  { region: "East", cities: ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Darjeeling", "Bhubaneswar", "Cuttack", "Puri", "Rourkela", "Ranchi", "Jamshedpur", "Bokaro", "Patna", "Gaya", "Muzaffarpur", "Bhagalpur"] },
  { region: "Central", cities: ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Raipur", "Bilaspur"] },
  { region: "North-East", cities: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur", "Shillong", "Imphal", "Aizawl", "Kohima", "Itanagar", "Gangtok", "Agartala"] },
  { region: "Islands", cities: ["Port Blair"] },
];

export const ALL_INDIA_CITIES: string[] = INDIA_REGIONS.flatMap((r) => r.cities);
export const DEFAULT_CITY = "Bengaluru";
