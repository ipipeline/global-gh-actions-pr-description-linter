import {PrBodyValidationService} from '../src/pr-body-validation.service'

var prBodyValidationService: PrBodyValidationService

const prBodyEmpty: string = ''
const prBodyJunk: string = `# Summary`

const prBodySignedOffButWithPlaceholders: string = `# Summary
**Describe the changes:**
{{!!DETAILS GO HERE!!}}

# Sign off
- [x] **Author(s):** I have reviewed the Code Safety Guidelines
- [x] **Reviewer(s):** I am signing off
`

const prBodyNotSignedOffAndNoPlaceholders: string = `# Summary
**Describe the changes:**
This changes X, Y, Z

# Sign off
- [] **Author(s):** I have reviewed the Code Safety Guidelines
- [] **Reviewer(s):** I am signing off
`

const prBodyComplete: string = `# Summary
**Describe the changes:**
This changes X, Y, Z

# Sign off
- [x] **Author(s):** I have reviewed the Code Safety Guidelines
- [x] **Reviewer(s):** I am signing off
`

var testCases = [
  {
    title: 'A PR Body that is NULL should fail and return: ',
    expectedMessagePrefix: 'The PR Body is empty',
    body: null,
    isPrBodyCompleteExpected: false
  },
  {
    title: 'A PR Body that is undefined should fail and return: ',
    expectedMessagePrefix: 'The PR Body is empty',
    body: undefined,
    isPrBodyCompleteExpected: false
  },
  {
    title: 'A PR Body with placeholders should fail and return: ',
    expectedMessagePrefix: 'Please complete all placeholders',
    body: prBodySignedOffButWithPlaceholders,
    isPrBodyCompleteExpected: false
  },
  {
    title:
      'A PR Body without placeholders but has not been signed off should fail and return: ',
    expectedMessagePrefix: 'Please complete the Sign off section',
    body: prBodyNotSignedOffAndNoPlaceholders,
    isPrBodyCompleteExpected: false
  },
  {
    title:
      'A PR Body without placeholders that is signed off should pass and return: ',
    expectedMessagePrefix: 'Nice work',
    body: prBodyComplete,
    isPrBodyCompleteExpected: true
  }
]

beforeEach(() => {
  prBodyValidationService = new PrBodyValidationService()
})

testCases.forEach(function (testCase) {
  test(
    testCase.title + '"' + testCase.expectedMessagePrefix + '"',
    async () => {
      var result = await prBodyValidationService.validateBody(testCase.body)

      expect(result.isPrBodyComplete).toBe(testCase.isPrBodyCompleteExpected)
      expect(result.message).toContain(testCase.expectedMessagePrefix)
    }
  )
})
