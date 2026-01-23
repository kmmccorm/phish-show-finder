
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
    tourid: "101",
    tags: [
      { name: "Jam" },
      { name: "Noteworthy" }
    ]
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
    isjam: "1",
    tags: [
      { name: "Jam" }, // Duplicate - should be deduplicated
      { name: "Debut" }
    ]
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

    // Check tags are extracted and deduplicated
    expect(result[0].tags).toBeDefined();
    expect(result[0].tags?.length).toBe(3); // Jam, Noteworthy, Debut (deduplicated)
    expect(result[0].tags?.some(t => t.name === "Jam")).toBeTruthy();
    expect(result[0].tags?.some(t => t.name === "Noteworthy")).toBeTruthy();
    expect(result[0].tags?.some(t => t.name === "Debut")).toBeTruthy();
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
    expect(result[0].tags).toEqual([]); // Should have empty tags array
  });

  test('should handle shows without tags', () => {
    const dataWithoutTags = [
      {
        showid: "99999",
        showdate: "2023-07-01",
        venue: "Test Venue",
        city: "Test City",
        state: "TS",
        country: "USA",
        song: "Test Song",
        set: "1",
        position: "1"
      }
    ];

    const result = transformShowData(dataWithoutTags);

    expect(result.length).toBe(1);
    expect(result[0].tags).toEqual([]); // Should have empty array, not undefined
  });

  test('should handle invalid position numbers', () => {
    const dataWithInvalidPositions = [
      {
        showid: "12345",
        showdate: "2023-08-01",
        venue: "Test Venue",
        city: "Test City",
        state: "TS",
        country: "USA",
        song: "Valid Song",
        set: "1",
        position: "1" // Valid
      },
      {
        showid: "12345",
        showdate: "2023-08-01",
        venue: "Test Venue",
        city: "Test City",
        state: "TS",
        country: "USA",
        song: "Invalid Song 1",
        set: "1",
        position: "NaN" // Invalid - not a number
      },
      {
        showid: "12345",
        showdate: "2023-08-01",
        venue: "Test Venue",
        city: "Test City",
        state: "TS",
        country: "USA",
        song: "Invalid Song 2",
        set: "1",
        position: "-1" // Invalid - negative
      },
      {
        showid: "12345",
        showdate: "2023-08-01",
        venue: "Test Venue",
        city: "Test City",
        state: "TS",
        country: "USA",
        song: "Invalid Song 3",
        set: "1",
        position: "0" // Invalid - zero
      },
      {
        showid: "12345",
        showdate: "2023-08-01",
        venue: "Test Venue",
        city: "Test City",
        state: "TS",
        country: "USA",
        song: "Valid Song 2",
        set: "1",
        position: "2" // Valid
      }
    ];

    const result = transformShowData(dataWithInvalidPositions);

    expect(result.length).toBe(1);
    // Should only include songs with valid positions (1 and 2)
    expect(result[0].songs?.length).toBe(2);
    expect(result[0].songs?.[0].name).toBe("Valid Song");
    expect(result[0].songs?.[1].name).toBe("Valid Song 2");
    // Invalid position songs should be filtered out
    expect(result[0].songs?.some(s => s.name === "Invalid Song 1")).toBeFalsy();
    expect(result[0].songs?.some(s => s.name === "Invalid Song 2")).toBeFalsy();
    expect(result[0].songs?.some(s => s.name === "Invalid Song 3")).toBeFalsy();
  });

  test('should correctly parse valid position strings', () => {
    const dataWithStringPositions = [
      {
        showid: "12345",
        showdate: "2023-08-01",
        venue: "Test Venue",
        city: "Test City",
        state: "TS",
        country: "USA",
        song: "Song Three",
        set: "1",
        position: "3" // String number
      },
      {
        showid: "12345",
        showdate: "2023-08-01",
        venue: "Test Venue",
        city: "Test City",
        state: "TS",
        country: "USA",
        song: "Song One",
        set: "1",
        position: "1" // String number
      }
    ];

    const result = transformShowData(dataWithStringPositions);

    expect(result.length).toBe(1);
    expect(result[0].songs?.length).toBe(2);
    // Verify positions are numbers
    expect(typeof result[0].songs?.[0].position).toBe('number');
    expect(typeof result[0].songs?.[1].position).toBe('number');
    // Verify the songs are properly ordered by position in sets
    expect(result[0].sets?.[0].songs[0].name).toBe("Song One");
    expect(result[0].sets?.[0].songs[1].name).toBe("Song Three");
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
