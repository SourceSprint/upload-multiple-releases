export class CriticalError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'CriticalError'

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, CriticalError.prototype)
    }
}

