import {
  MAX_DESCRIPTION_LENGTH,
  MAX_INSTRUCTIONS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH,
} from './constants'

/** Validate and truncate a string field to a max length. Throws if exceeded. */
export function validateStringLength(
  value: string | undefined | null,
  fieldName: string,
  maxLength: number,
): void {
  if (value && value.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer`)
  }
}

/** Validate notes fields (workout notes, set notes, plan exercise notes) */
export function validateNotes(notes: string | undefined | null): void {
  validateStringLength(notes, 'Notes', MAX_NOTES_LENGTH)
}

/** Validate instructions fields */
export function validateInstructions(
  instructions: string | undefined | null,
): void {
  validateStringLength(instructions, 'Instructions', MAX_INSTRUCTIONS_LENGTH)
}

/** Validate description fields */
export function validateDescription(
  description: string | undefined | null,
): void {
  validateStringLength(description, 'Description', MAX_DESCRIPTION_LENGTH)
}

/** Validate name fields */
export function validateNameLength(name: string | undefined | null): void {
  validateStringLength(name, 'Name', MAX_NAME_LENGTH)
}
