// This file is auto-generated by @hey-api/openapi-ts

export const ExceptionDTOSchema = {
	required: ["message"],
	type: "object",
	properties: {
		stackTrace: {
			type: "string",
			nullable: true,
		},
		message: {
			minLength: 1,
			type: "string",
		},
	},
	additionalProperties: false,
} as const;

export const ParameterDTOSchema = {
	required: [
		"description",
		"is_configurable_from_web_ui",
		"name",
		"parameter_type",
		"step_name",
		"variable_name",
	],
	type: "object",
	properties: {
		name: {
			minLength: 1,
			type: "string",
		},
		parameter_type: {
			minLength: 1,
			type: "string",
		},
		variable_name: {
			minLength: 1,
			type: "string",
		},
		step_name: {
			minLength: 1,
			type: "string",
		},
		is_configurable_from_web_ui: {
			type: "boolean",
		},
		description: {
			minLength: 1,
			type: "string",
		},
		fullName: {
			type: "string",
			nullable: true,
			readOnly: true,
		},
	},
	additionalProperties: false,
} as const;

export const StepDTOSchema = {
	required: ["name", "step_type"],
	type: "object",
	properties: {
		description: {
			type: "string",
			nullable: true,
		},
		dependencies: {
			type: "array",
			items: {
				type: "string",
			},
			nullable: true,
		},
		parameters: {
			type: "array",
			items: {
				$ref: "#/components/schemas/ParameterDTO",
			},
			nullable: true,
		},
		step_type: {
			minLength: 1,
			type: "string",
		},
		name: {
			minLength: 1,
			type: "string",
		},
	},
	additionalProperties: false,
} as const;

export const StepRunDTOSchema = {
	required: ["generation", "status"],
	type: "object",
	properties: {
		step: {
			$ref: "#/components/schemas/StepDTO",
		},
		variables: {
			type: "array",
			items: {
				$ref: "#/components/schemas/VariableDTO",
			},
			nullable: true,
		},
		result: {
			$ref: "#/components/schemas/VariableDTO",
		},
		exception: {
			$ref: "#/components/schemas/ExceptionDTO",
		},
		generation: {
			type: "integer",
			format: "int32",
		},
		status: {
			minLength: 1,
			type: "string",
		},
	},
	additionalProperties: false,
} as const;

export const StepWiseImageSchema = {
	type: "object",
	properties: {
		url: {
			type: "string",
			nullable: true,
		},
		name: {
			type: "string",
			nullable: true,
		},
		content_type: {
			type: "string",
			nullable: true,
		},
		blob_type: {
			type: "string",
			nullable: true,
			readOnly: true,
		},
	},
	additionalProperties: false,
} as const;

export const StepWiseServiceConfigurationSchema = {
	type: "object",
	properties: {
		enableAuth0Authentication: {
			type: "boolean",
		},
		auth0Domain: {
			type: "string",
			nullable: true,
		},
		auth0ClientId: {
			type: "string",
			nullable: true,
		},
		auth0Audience: {
			type: "string",
			nullable: true,
		},
		version: {
			type: "string",
			nullable: true,
		},
	},
	additionalProperties: false,
} as const;

export const VariableDTOSchema = {
	required: ["generation", "name", "type"],
	type: "object",
	properties: {
		value: {
			nullable: true,
		},
		displayValue: {
			type: "string",
			nullable: true,
		},
		name: {
			minLength: 1,
			type: "string",
		},
		type: {
			minLength: 1,
			type: "string",
		},
		generation: {
			type: "integer",
			format: "int32",
		},
	},
	additionalProperties: false,
} as const;

export const WorkflowDTOSchema = {
	required: ["name", "steps"],
	type: "object",
	properties: {
		description: {
			type: "string",
			nullable: true,
		},
		name: {
			minLength: 1,
			type: "string",
		},
		steps: {
			type: "array",
			items: {
				$ref: "#/components/schemas/StepDTO",
			},
		},
	},
	additionalProperties: false,
} as const;
