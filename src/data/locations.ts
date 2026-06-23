export const statesData: Record<string, {
  cities: string[];
  universities: string[];
}> = {
  "Arizona": {
    cities: ["Phoenix", "Tucson", "Tempe", "Scottsdale", "Mesa", "Flagstaff", "Chandler"],
    universities: ["Grand Canyon University", "Arizona State University", "University of Arizona", "Northern Arizona University"]
  },
  "California": {
    cities: ["Los Angeles", "San Francisco", "San Diego", "Berkeley", "San Jose", "Sacramento", "Irvine"],
    universities: ["UCLA", "UC Berkeley", "USC", "Stanford University", "UC San Diego", "UC Davis", "Cal State LA"]
  },
  "New York": {
    cities: ["New York City", "Buffalo", "Albany", "Rochester", "Syracuse", "Ithaca"],
    universities: ["NYU", "Columbia University", "Cornell University", "SUNY Buffalo", "Fordham University"]
  },
  "Texas": {
    cities: ["Houston", "Austin", "Dallas", "San Antonio", "Fort Worth", "El Paso"],
    universities: ["University of Texas Austin", "Texas A&M", "Rice University", "SMU", "University of Houston", "UT Dallas"]
  },
  "Illinois": {
    cities: ["Chicago", "Evanston", "Champaign", "Urbana", "Springfield"],
    universities: ["University of Chicago", "Northwestern University", "UIC", "University of Illinois", "DePaul University"]
  },
  "Massachusetts": {
    cities: ["Boston", "Cambridge", "Worcester", "Springfield", "Amherst"],
    universities: ["MIT", "Harvard University", "Boston University", "Northeastern", "UMass Amherst", "Tufts University"]
  },
  "Washington": {
    cities: ["Seattle", "Bellevue", "Tacoma", "Spokane", "Redmond"],
    universities: ["University of Washington", "Seattle University", "Washington State University"]
  },
  "Florida": {
    cities: ["Miami", "Orlando", "Tampa", "Jacksonville", "Gainesville", "Tallahassee"],
    universities: ["University of Florida", "University of Miami", "Florida State University", "UCF", "FIU", "USF"]
  },
  "Pennsylvania": {
    cities: ["Philadelphia", "Pittsburgh", "State College", "Allentown"],
    universities: ["University of Pennsylvania", "Carnegie Mellon", "Penn State", "Temple University", "Drexel University"]
  },
  "Georgia": {
    cities: ["Atlanta", "Athens", "Savannah", "Augusta"],
    universities: ["Georgia Tech", "Emory University", "University of Georgia", "Georgia State University"]
  },
  "Michigan": {
    cities: ["Detroit", "Ann Arbor", "East Lansing", "Grand Rapids"],
    universities: ["University of Michigan", "Michigan State University", "Wayne State University"]
  },
  "Ohio": {
    cities: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron"],
    universities: ["Ohio State University", "Case Western Reserve", "University of Cincinnati"]
  },
  "North Carolina": {
    cities: ["Charlotte", "Raleigh", "Durham", "Chapel Hill", "Greensboro"],
    universities: ["Duke University", "UNC Chapel Hill", "NC State", "Wake Forest University"]
  },
  "New Jersey": {
    cities: ["Newark", "Jersey City", "Princeton", "New Brunswick", "Hoboken"],
    universities: ["Princeton University", "Rutgers University", "Stevens Institute", "NJIT"]
  },
  "Colorado": {
    cities: ["Denver", "Boulder", "Fort Collins", "Aurora", "Colorado Springs"],
    universities: ["University of Colorado Boulder", "Colorado State University", "DU", "Mines"]
  },
  "Virginia": {
    cities: ["Fairfax", "Arlington", "Richmond", "Charlottesville", "Blacksburg"],
    universities: ["University of Virginia", "Virginia Tech", "George Mason University", "William & Mary"]
  },
  "Minnesota": {
    cities: ["Minneapolis", "Saint Paul", "Rochester", "Duluth"],
    universities: ["University of Minnesota", "Macalester College", "St. Thomas University"]
  },
  "Indiana": {
    cities: ["Indianapolis", "Bloomington", "West Lafayette", "South Bend"],
    universities: ["Purdue University", "Indiana University", "Notre Dame", "Butler University"]
  }
};

export const states = Object.keys(statesData).sort();
