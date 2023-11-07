import { PrBodyValidationService } from '../src/pr-body-validation.service';

var prBodyValidationService: PrBodyValidationService;

const prBodyEmpty: string = '';
const prBodyJunk: string = `# Summary`;

const prBodySignedOffButWithOnePlaceholder: string = `# Summary
**Describe the changes:**
{{!!DETAILS GO HERE!!}}

# Sign off
- [x] **Author(s):** I have reviewed the Code Safety Guidelines
`;

const prBodySignedOffButWithTwoPlaceholders: string = `# Summary
**Describe the changes:**
{{!!DETAILS GO HERE!!}}

**Something else:**
{{!!DETAILS GO HERE!!}}

# Sign off
- [x] **Author(s):** I have reviewed the Code Safety Guidelines
`;

const prBodyNotSignedOffAndNoPlaceholders: string = `# Summary
**Describe the changes:**
This changes X, Y, Z

# Sign off
- [] **Author(s):** I have reviewed the Code Safety Guidelines
`;

const prBodyComplete: string = `# Summary
**Describe the changes:**
This changes X, Y, Z

# Sign off
- [x] **Author(s):** I have reviewed the Code Safety Guidelines
`;

var testCases = [
  {
    title: 'A PR Description that is NULL should fail and return: ',
    expectedMessagePrefix: 'The PR Description is empty',
    body: null,
    isPrBodyCompleteExpected: false,
  },
  {
    title: 'A PR Description that is undefined should fail and return: ',
    expectedMessagePrefix: 'The PR Description is empty',
    body: undefined,
    isPrBodyCompleteExpected: false,
  },
  {
    title: 'A PR Description with one placeholder should fail and return: ',
    expectedMessagePrefix: `Please complete all placeholders: {{!!DETAILS GO HERE!!}} found 1 time(s)`,
    body: prBodySignedOffButWithOnePlaceholder,
    isPrBodyCompleteExpected: false,
  },
  {
    title: 'A PR Description with two placeholders should fail and return: ',
    expectedMessagePrefix: `Please complete all placeholders: {{!!DETAILS GO HERE!!}} found 2 time(s)`,
    body: prBodySignedOffButWithTwoPlaceholders,
    isPrBodyCompleteExpected: false,
  },
  {
    title:
      'A PR Description without placeholders but has not been signed off should fail and return: ',
    expectedMessagePrefix: 'Please complete the Sign off section',
    body: prBodyNotSignedOffAndNoPlaceholders,
    isPrBodyCompleteExpected: false,
  },
  {
    title:
      'A PR Description without placeholders that is signed off should pass and return: ',
    expectedMessagePrefix: 'Nice work',
    body: prBodyComplete,
    isPrBodyCompleteExpected: true,
  },
];

beforeEach(() => {
  prBodyValidationService = new PrBodyValidationService();
});

testCases.forEach(function (testCase) {
  test(
    testCase.title + '"' + testCase.expectedMessagePrefix + '"',
    async () => {
      var result = await prBodyValidationService.validateBody(testCase.body);

      expect(result.isPrBodyComplete).toBe(testCase.isPrBodyCompleteExpected);
      expect(result.message).toContain(testCase.expectedMessagePrefix);
    },
  );
});
