
/**
 * Tests for show data processing utilities
 */

import { transformShowData, extractShowTags } from '../services/show-processor';

// Sample raw data for testing
const mockRawData = [
  {
    showid: "1234567",
    showdate: "2023-06-15",
    artist_name: "Phish",
    venue: "Madison Square Garden",
    city: "New York",
    state: "NY",
    country: "USA",
    song: "Tweezer",
    set: "1",
    position: "3",
    trans_mark: ">",
    tourname: "Summer 2023",
    tourid: "101"
  },
  {
    showid: "1234567",
    showdate: "2023-06-15",
    artist_name: "Phish",
    venue: "Madison Square Garden",
    city: "New York",
    state: "NY",
    country: "USA",
    song: "Stash",
    set: "1",
    position: "4",
    isjam: "1"
  }
];

describe('transformShowData', () => {
  test('should transform raw data into structured show objects', () => {
    const result = transformShowData(mockRawData);
    
    // Expect one show to be returned
    expect(result.length).toBe(1);
    
    // Check show properties
    expect(result[0].showid).toBe("1234567");
    expect(result[0].venue).toBe("Madison Square Garden");
    expect(result[0].city).toBe("New York");
    
    // Check songs array
    expect(result[0].songs?.length).toBe(2);
    
    // Check sets
    expect(result[0].sets?.length).toBe(1);
    expect(result[0].sets?.[0].name).toBe("Set 1");
    expect(result[0].sets?.[0].songs.length).toBe(2);
    
    // Check tour information
    expect(result[0].tours?.length).toBe(1);
    expect(result[0].tours?.[0].name).toBe("Summer 2023");
  });
  
  test('should handle empty or invalid data', () => {
    expect(transformShowData([])).toEqual([]);
    expect(transformShowData([{}])).toEqual([]);
    // @ts-ignore: Testing with null
    expect(transformShowData(null)).toEqual([]);
    // @ts-ignore: Testing with undefined
    expect(transformShowData(undefined)).toEqual([]);
  });
  
  test('should handle missing fields gracefully', () => {
    const incompleteData = [
      {
        showid: "12345",
        // Missing other fields
      }
    ];
    
    const result = transformShowData(incompleteData);
    
    expect(result.length).toBe(1);
    expect(result[0].showid).toBe("12345");
    expect(result[0].venue).toBe("Unknown Venue");
    expect(result[0].artist_name).toBe("Phish");
  });
});

describe('extractShowTags', () => {
  test('should extract tags from raw data', () => {
    const dataWithTags = [
      {
        showid: "1234",
        tags: [
          { name: "Jam" },
          { name: "Debut" }
        ]
      },
      {
        showid: "1234",
        tags: [
          { name: "Jam" }, // Duplicate
          { name: "Noteworthy" }
        ]
      }
    ];
    
    const result = extractShowTags(dataWithTags);
    
    expect(Object.keys(result).length).toBe(1);
    expect(result["1234"].length).toBe(3); // Should deduplicate
    expect(result["1234"].some(t => t.name === "Jam")).toBeTruthy();
    expect(result["1234"].some(t => t.name === "Debut")).toBeTruthy();
    expect(result["1234"].some(t => t.name === "Noteworthy")).toBeTruthy();
  });
  
  test('should handle missing or invalid tags', () => {
    const invalidData = [
      {
        showid: "1234",
        // No tags
      },
      {
        showid: "5678",
        tags: null
      }
    ];
    
    const result = extractShowTags(invalidData);
    
    expect(Object.keys(result).length).toBe(0);
  });
});
