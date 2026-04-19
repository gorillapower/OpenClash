# Service Contract

Status: Draft

## Purpose

Define the stable contract between the user-facing layer and the backend or
service layer.

## Contract

### Contract Rule

- The user-facing layer must interact through the documented contract, not
  through ad hoc filesystem mutation, shell calls, or implementation details.

### Identity

- Define the stable service, API, package, or endpoint identities.

### Required Operations

- List the required operations the contract must support.
- Describe expected behavior for each operation.

### Error Model

- Define the error categories the contract must surface clearly.

### Status And Reporting

- Define the minimum machine-readable state needed by the user-facing layer.

### Change Control

- Later tasks may refactor internals freely if they preserve this contract.
- If a later task needs to change the contract, update this document first.

## Notes

- Record any known transitional debt without treating it as the accepted target
  contract.
