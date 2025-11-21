export interface Schema<T> {
  parse(input: unknown): T;
}

export function fromZod<T>(schema: { parse: (input: unknown) => T }): Schema<T> {
  return {
    parse: (input) => schema.parse(input),
  };
}

export function fromEffectSchema<T>(schema: any): Schema<T> {
  return {
    parse: (input) => {
      if (typeof schema.decode === "function") {
        const decoded = schema.decode(input);
        if (decoded._tag === "Left") {
          throw new Error("Invalid schema");
        }
        return decoded.right as T;
      }
      throw new Error("Unsupported Effect schema");
    },
  };
}

