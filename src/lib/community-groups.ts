export type CommunityGroup = {
  id: string;
  name: string;
  description: string;
  type: "School" | "City" | "Custom";
  location?: string;
  memberCount?: number;
  createdBy?: string;
  messages?: Array<{ id: string; author: string; body: string; createdAt?: string }>;
};

export const PRESET_GROUPS: CommunityGroup[] = [
  { id: "asu", name: "Arizona State University", description: "International student community for ASU.", type: "School", location: "Tempe, Arizona", memberCount: 0, messages: [] },
  { id: "gcu", name: "Grand Canyon University", description: "International student community for GCU.", type: "School", location: "Phoenix, Arizona", memberCount: 0, messages: [] },
  { id: "university-of-arizona", name: "University of Arizona", description: "International student community for University of Arizona.", type: "School", location: "Tucson, Arizona", memberCount: 0, messages: [] },
  { id: "ut-austin", name: "University of Texas at Austin", description: "International student community for UT Austin.", type: "School", location: "Austin, Texas", memberCount: 0, messages: [] },
  { id: "texas-am", name: "Texas A&M University", description: "International student community for Texas A&M.", type: "School", location: "College Station, Texas", memberCount: 0, messages: [] },
  { id: "ucla", name: "UCLA", description: "International student community for UCLA.", type: "School", location: "Los Angeles, California", memberCount: 0, messages: [] },
  { id: "usc", name: "University of Southern California", description: "International student community for USC.", type: "School", location: "Los Angeles, California", memberCount: 0, messages: [] },
  { id: "uc-berkeley", name: "UC Berkeley", description: "International student community for UC Berkeley.", type: "School", location: "Berkeley, California", memberCount: 0, messages: [] },
  { id: "stanford", name: "Stanford University", description: "International student community for Stanford.", type: "School", location: "Stanford, California", memberCount: 0, messages: [] },
  { id: "nyu", name: "New York University", description: "International student community for NYU.", type: "School", location: "New York, New York", memberCount: 0, messages: [] },
  { id: "columbia", name: "Columbia University", description: "International student community for Columbia.", type: "School", location: "New York, New York", memberCount: 0, messages: [] },
  { id: "northeastern", name: "Northeastern University", description: "International student community for Northeastern.", type: "School", location: "Boston, Massachusetts", memberCount: 0, messages: [] },
  { id: "boston-university", name: "Boston University", description: "International student community for BU.", type: "School", location: "Boston, Massachusetts", memberCount: 0, messages: [] },
  { id: "uiuc", name: "University of Illinois Urbana-Champaign", description: "International student community for UIUC.", type: "School", location: "Urbana-Champaign, Illinois", memberCount: 0, messages: [] },
  { id: "university-of-washington", name: "University of Washington", description: "International student community for UW.", type: "School", location: "Seattle, Washington", memberCount: 0, messages: [] },
  { id: "georgia-tech", name: "Georgia Tech", description: "International student community for Georgia Tech.", type: "School", location: "Atlanta, Georgia", memberCount: 0, messages: [] },
  { id: "university-of-michigan", name: "University of Michigan", description: "International student community for University of Michigan.", type: "School", location: "Ann Arbor, Michigan", memberCount: 0, messages: [] },
  { id: "purdue", name: "Purdue University", description: "International student community for Purdue.", type: "School", location: "West Lafayette, Indiana", memberCount: 0, messages: [] },
  { id: "university-of-florida", name: "University of Florida", description: "International student community for University of Florida.", type: "School", location: "Gainesville, Florida", memberCount: 0, messages: [] },
  { id: "upenn", name: "University of Pennsylvania", description: "International student community for Penn.", type: "School", location: "Philadelphia, Pennsylvania", memberCount: 0, messages: [] },
  { id: "phoenix", name: "Phoenix", description: "City group for international students and newcomers in Phoenix.", type: "City", location: "Arizona", memberCount: 0, messages: [] },
  { id: "tempe", name: "Tempe", description: "City group for international students and newcomers in Tempe.", type: "City", location: "Arizona", memberCount: 0, messages: [] },
  { id: "los-angeles", name: "Los Angeles", description: "City group for international students and newcomers in Los Angeles.", type: "City", location: "California", memberCount: 0, messages: [] },
  { id: "san-francisco-bay-area", name: "San Francisco Bay Area", description: "City group for international students and newcomers in the Bay Area.", type: "City", location: "California", memberCount: 0, messages: [] },
  { id: "new-york-city", name: "New York City", description: "City group for international students and newcomers in New York City.", type: "City", location: "New York", memberCount: 0, messages: [] },
  { id: "boston", name: "Boston", description: "City group for international students and newcomers in Boston.", type: "City", location: "Massachusetts", memberCount: 0, messages: [] },
  { id: "chicago", name: "Chicago", description: "City group for international students and newcomers in Chicago.", type: "City", location: "Illinois", memberCount: 0, messages: [] },
  { id: "austin", name: "Austin", description: "City group for international students and newcomers in Austin.", type: "City", location: "Texas", memberCount: 0, messages: [] },
  { id: "dallas-fort-worth", name: "Dallas-Fort Worth", description: "City group for international students and newcomers in DFW.", type: "City", location: "Texas", memberCount: 0, messages: [] },
  { id: "houston", name: "Houston", description: "City group for international students and newcomers in Houston.", type: "City", location: "Texas", memberCount: 0, messages: [] },
  { id: "seattle", name: "Seattle", description: "City group for international students and newcomers in Seattle.", type: "City", location: "Washington", memberCount: 0, messages: [] },
  { id: "atlanta", name: "Atlanta", description: "City group for international students and newcomers in Atlanta.", type: "City", location: "Georgia", memberCount: 0, messages: [] },
  { id: "miami", name: "Miami", description: "City group for international students and newcomers in Miami.", type: "City", location: "Florida", memberCount: 0, messages: [] },
  { id: "washington-dc", name: "Washington, DC", description: "City group for international students and newcomers in Washington, DC.", type: "City", location: "District of Columbia", memberCount: 0, messages: [] },
  { id: "san-diego", name: "San Diego", description: "City group for international students and newcomers in San Diego.", type: "City", location: "California", memberCount: 0, messages: [] },
  { id: "denver", name: "Denver", description: "City group for international students and newcomers in Denver.", type: "City", location: "Colorado", memberCount: 0, messages: [] },
];

export function getCommunityGroup(id: string) {
  return PRESET_GROUPS.find((group) => group.id === id) || null;
}
