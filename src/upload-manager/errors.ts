class CriticalError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'CriticalError'
    }
}

export {
    CriticalError
}