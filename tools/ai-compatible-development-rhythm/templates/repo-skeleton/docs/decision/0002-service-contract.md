# Service Contract

Status: Draft

## Purpose

Define the stable contract between the user-facing layer and the service or
backend layer.

## Contract

### Contract Rule

- The user-facing layer must interact through the documented contract, not
  through ad hoc shell calls, filesystem mutation, or hidden implementation
  details.

### Identity

- Define the stable service, API, package, or endpoint identities.

### Required Operations

- List the required operations the contract must support.
- Describe expected behavior for each operation.

### Error Model

- Define the error categories the contract must surface clearly.

### Change Control

- Later tasks may refactor internals freely if they preserve this contract.
- If a later task needs to change the contract, update this document first.
