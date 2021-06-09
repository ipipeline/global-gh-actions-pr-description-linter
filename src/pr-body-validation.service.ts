import * as core from '@actions/core'
import {IPrBodyValidationStatus} from './pr-body-validation-status.model'

export class PrBodyValidationService {
  private placeholderItems: string[] = [`{{!!DETAILS GO HERE!!}}`]

  private completedFinalChecklist: string[] = [
    `- [x] **Author(s):**`,
    `- [x] **Reviewer(s):**`
  ]

  async validateBody(
    prBody: string | null | undefined
  ): Promise<IPrBodyValidationStatus> {
    return new Promise(resolve => {
      core.debug(`Validating PR Description: ${prBody}`)

      // Should cater for undefined, null, empty
      if (!prBody || prBody.length < 1) {
        resolve({
          isPrBodyComplete: false,
          message: `The PR Description is empty - do you have the pull request template setup (docs -> pull_request_template.md)? ❌`
        })
        return
      }

      const arePlaceholdersIncomplete = this.placeholderItems.every(function (
        item
      ) {
        return prBody.includes(item)
      })

      if (arePlaceholdersIncomplete) {
        let placeholderValidationMessage = ''

        for (const placeholder of this.placeholderItems) {
          const regEx = new RegExp(placeholder, 'g')
          const placeholderCount = (prBody.match(regEx) || []).length

          if (placeholderValidationMessage.length > 0) {
            placeholderValidationMessage += ' | '
          }
          placeholderValidationMessage += `${placeholder} found ${placeholderCount} time(s)`
        }

        resolve({
          isPrBodyComplete: false,
          message: `Please complete all placeholders: ${placeholderValidationMessage} 🚫`
        })
        return
      }

      const isFinalChecklistComplete = this.completedFinalChecklist.every(
        function (item) {
          return prBody.includes(item)
        }
      )

      if (!isFinalChecklistComplete) {
        resolve({
          isPrBodyComplete: false,
          message: `Please complete the Sign off section: ${this.completedFinalChecklist.toString()} 🚫`
        })
        return
      }

      resolve({
        isPrBodyComplete: true,
        message: `Nice work 👍👍👍
                    The PR Description has passed all of the validation checks ✅✅✅.
                    The code can now be merged!`
      })
    })
  }
}
