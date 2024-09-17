// This file is auto-generated by @hey-api/openapi-ts

export type Assembly = {
    readonly definedTypes?: Array<TypeInfo> | null;
    readonly exportedTypes?: Array<Type> | null;
    /**
     * @deprecated
     */
    readonly codeBase?: (string) | null;
    entryPoint?: MethodInfo;
    readonly fullName?: (string) | null;
    readonly imageRuntimeVersion?: (string) | null;
    readonly isDynamic?: boolean;
    readonly location?: (string) | null;
    readonly reflectionOnly?: boolean;
    readonly isCollectible?: boolean;
    readonly isFullyTrusted?: boolean;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    /**
     * @deprecated
     */
    readonly escapedCodeBase?: (string) | null;
    manifestModule?: Module;
    readonly modules?: Array<Module> | null;
    /**
     * @deprecated
     */
    readonly globalAssemblyCache?: boolean;
    readonly hostContext?: number;
    securityRuleSet?: SecurityRuleSet;
};

export type CallingConventions = 1 | 2 | 3 | 32 | 64;

export type ConstructorInfo = {
    readonly name?: (string) | null;
    declaringType?: Type;
    reflectedType?: Type;
    module?: Module;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly isCollectible?: boolean;
    readonly metadataToken?: number;
    attributes?: MethodAttributes;
    methodImplementationFlags?: MethodImplAttributes;
    callingConvention?: CallingConventions;
    readonly isAbstract?: boolean;
    readonly isConstructor?: boolean;
    readonly isFinal?: boolean;
    readonly isHideBySig?: boolean;
    readonly isSpecialName?: boolean;
    readonly isStatic?: boolean;
    readonly isVirtual?: boolean;
    readonly isAssembly?: boolean;
    readonly isFamily?: boolean;
    readonly isFamilyAndAssembly?: boolean;
    readonly isFamilyOrAssembly?: boolean;
    readonly isPrivate?: boolean;
    readonly isPublic?: boolean;
    readonly isConstructedGenericMethod?: boolean;
    readonly isGenericMethod?: boolean;
    readonly isGenericMethodDefinition?: boolean;
    readonly containsGenericParameters?: boolean;
    methodHandle?: RuntimeMethodHandle;
    readonly isSecurityCritical?: boolean;
    readonly isSecuritySafeCritical?: boolean;
    readonly isSecurityTransparent?: boolean;
    memberType?: MemberTypes;
};

export type CustomAttributeData = {
    attributeType?: Type;
    constructor?: ConstructorInfo;
    readonly constructorArguments?: Array<CustomAttributeTypedArgument> | null;
    readonly namedArguments?: Array<CustomAttributeNamedArgument> | null;
};

export type CustomAttributeNamedArgument = {
    memberInfo?: MemberInfo;
    typedValue?: CustomAttributeTypedArgument;
    readonly memberName?: (string) | null;
    readonly isField?: boolean;
};

export type CustomAttributeTypedArgument = {
    argumentType?: Type;
    value?: unknown;
};

export type EventAttributes = 0 | 512 | 1024;

export type EventInfo = {
    readonly name?: (string) | null;
    declaringType?: Type;
    reflectedType?: Type;
    module?: Module;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly isCollectible?: boolean;
    readonly metadataToken?: number;
    memberType?: MemberTypes;
    attributes?: EventAttributes;
    readonly isSpecialName?: boolean;
    addMethod?: MethodInfo;
    removeMethod?: MethodInfo;
    raiseMethod?: MethodInfo;
    readonly isMulticast?: boolean;
    eventHandlerType?: Type;
};

export type Exception = {
    targetSite?: MethodBase;
    readonly message?: (string) | null;
    readonly data?: {
        [key: string]: unknown;
    } | null;
    innerException?: Exception;
    helpLink?: (string) | null;
    source?: (string) | null;
    hResult?: number;
    readonly stackTrace?: (string) | null;
};

export type FieldAttributes = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 4096 | 8192 | 32768 | 38144;

export type FieldInfo = {
    readonly name?: (string) | null;
    declaringType?: Type;
    reflectedType?: Type;
    module?: Module;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly isCollectible?: boolean;
    readonly metadataToken?: number;
    memberType?: MemberTypes;
    attributes?: FieldAttributes;
    fieldType?: Type;
    readonly isInitOnly?: boolean;
    readonly isLiteral?: boolean;
    /**
     * @deprecated
     */
    readonly isNotSerialized?: boolean;
    readonly isPinvokeImpl?: boolean;
    readonly isSpecialName?: boolean;
    readonly isStatic?: boolean;
    readonly isAssembly?: boolean;
    readonly isFamily?: boolean;
    readonly isFamilyAndAssembly?: boolean;
    readonly isFamilyOrAssembly?: boolean;
    readonly isPrivate?: boolean;
    readonly isPublic?: boolean;
    readonly isSecurityCritical?: boolean;
    readonly isSecuritySafeCritical?: boolean;
    readonly isSecurityTransparent?: boolean;
    fieldHandle?: RuntimeFieldHandle;
};

export type GenericParameterAttributes = 0 | 1 | 2 | 3 | 4 | 8 | 16 | 28;

export type ICustomAttributeProvider = {
    [key: string]: unknown;
};

export type IntPtr = {
    [key: string]: unknown;
};

export type LayoutKind = 0 | 2 | 3;

export type MemberInfo = {
    memberType?: MemberTypes;
    readonly name?: (string) | null;
    declaringType?: Type;
    reflectedType?: Type;
    module?: Module;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly isCollectible?: boolean;
    readonly metadataToken?: number;
};

export type MemberTypes = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 191;

export type MethodAttributes = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768 | 53248;

export type MethodBase = {
    memberType?: MemberTypes;
    readonly name?: (string) | null;
    declaringType?: Type;
    reflectedType?: Type;
    module?: Module;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly isCollectible?: boolean;
    readonly metadataToken?: number;
    attributes?: MethodAttributes;
    methodImplementationFlags?: MethodImplAttributes;
    callingConvention?: CallingConventions;
    readonly isAbstract?: boolean;
    readonly isConstructor?: boolean;
    readonly isFinal?: boolean;
    readonly isHideBySig?: boolean;
    readonly isSpecialName?: boolean;
    readonly isStatic?: boolean;
    readonly isVirtual?: boolean;
    readonly isAssembly?: boolean;
    readonly isFamily?: boolean;
    readonly isFamilyAndAssembly?: boolean;
    readonly isFamilyOrAssembly?: boolean;
    readonly isPrivate?: boolean;
    readonly isPublic?: boolean;
    readonly isConstructedGenericMethod?: boolean;
    readonly isGenericMethod?: boolean;
    readonly isGenericMethodDefinition?: boolean;
    readonly containsGenericParameters?: boolean;
    methodHandle?: RuntimeMethodHandle;
    readonly isSecurityCritical?: boolean;
    readonly isSecuritySafeCritical?: boolean;
    readonly isSecurityTransparent?: boolean;
};

export type MethodImplAttributes = 0 | 1 | 2 | 3 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 4096 | 65535;

export type MethodInfo = {
    readonly name?: (string) | null;
    declaringType?: Type;
    reflectedType?: Type;
    module?: Module;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly isCollectible?: boolean;
    readonly metadataToken?: number;
    attributes?: MethodAttributes;
    methodImplementationFlags?: MethodImplAttributes;
    callingConvention?: CallingConventions;
    readonly isAbstract?: boolean;
    readonly isConstructor?: boolean;
    readonly isFinal?: boolean;
    readonly isHideBySig?: boolean;
    readonly isSpecialName?: boolean;
    readonly isStatic?: boolean;
    readonly isVirtual?: boolean;
    readonly isAssembly?: boolean;
    readonly isFamily?: boolean;
    readonly isFamilyAndAssembly?: boolean;
    readonly isFamilyOrAssembly?: boolean;
    readonly isPrivate?: boolean;
    readonly isPublic?: boolean;
    readonly isConstructedGenericMethod?: boolean;
    readonly isGenericMethod?: boolean;
    readonly isGenericMethodDefinition?: boolean;
    readonly containsGenericParameters?: boolean;
    methodHandle?: RuntimeMethodHandle;
    readonly isSecurityCritical?: boolean;
    readonly isSecuritySafeCritical?: boolean;
    readonly isSecurityTransparent?: boolean;
    memberType?: MemberTypes;
    returnParameter?: ParameterInfo;
    returnType?: Type;
    returnTypeCustomAttributes?: ICustomAttributeProvider;
};

export type Module = {
    assembly?: Assembly;
    readonly fullyQualifiedName?: (string) | null;
    readonly name?: (string) | null;
    readonly mdStreamVersion?: number;
    readonly moduleVersionId?: string;
    readonly scopeName?: (string) | null;
    moduleHandle?: ModuleHandle;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly metadataToken?: number;
};

export type ModuleHandle = {
    readonly mdStreamVersion?: number;
};

export type ParameterAttributes = 0 | 1 | 2 | 4 | 8 | 16 | 4096 | 8192 | 16384 | 32768 | 61440;

export type ParameterInfo = {
    attributes?: ParameterAttributes;
    member?: MemberInfo;
    readonly name?: (string) | null;
    parameterType?: Type;
    readonly position?: number;
    readonly isIn?: boolean;
    readonly isLcid?: boolean;
    readonly isOptional?: boolean;
    readonly isOut?: boolean;
    readonly isRetval?: boolean;
    readonly defaultValue?: unknown;
    readonly rawDefaultValue?: unknown;
    readonly hasDefaultValue?: boolean;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly metadataToken?: number;
};

export type PropertyAttributes = 0 | 512 | 1024 | 4096 | 8192 | 16384 | 32768 | 62464;

export type PropertyInfo = {
    readonly name?: (string) | null;
    declaringType?: Type;
    reflectedType?: Type;
    module?: Module;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly isCollectible?: boolean;
    readonly metadataToken?: number;
    memberType?: MemberTypes;
    propertyType?: Type;
    attributes?: PropertyAttributes;
    readonly isSpecialName?: boolean;
    readonly canRead?: boolean;
    readonly canWrite?: boolean;
    getMethod?: MethodInfo;
    setMethod?: MethodInfo;
};

export type RuntimeFieldHandle = {
    value?: IntPtr;
};

export type RuntimeMethodHandle = {
    value?: IntPtr;
};

export type RuntimeTypeHandle = {
    value?: IntPtr;
};

export type SecurityRuleSet = 0 | 1 | 2;

export type StepDTO = {
    name?: (string) | null;
    description?: (string) | null;
    dependencies?: Array<(string)> | null;
    variables?: Array<(string)> | null;
};

export type StepRunDTO = {
    step?: StepDTO;
    variables?: Array<VariableDTO> | null;
    generation?: number;
    status?: (string) | null;
    result?: VariableDTO;
    exception?: Exception;
};

export type StructLayoutAttribute = {
    readonly typeId?: unknown;
    value?: LayoutKind;
};

export type Type = {
    readonly name?: (string) | null;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly isCollectible?: boolean;
    readonly metadataToken?: number;
    readonly isInterface?: boolean;
    memberType?: MemberTypes;
    readonly namespace?: (string) | null;
    readonly assemblyQualifiedName?: (string) | null;
    readonly fullName?: (string) | null;
    assembly?: Assembly;
    module?: Module;
    readonly isNested?: boolean;
    declaringType?: Type;
    declaringMethod?: MethodBase;
    reflectedType?: Type;
    underlyingSystemType?: Type;
    readonly isTypeDefinition?: boolean;
    readonly isArray?: boolean;
    readonly isByRef?: boolean;
    readonly isPointer?: boolean;
    readonly isConstructedGenericType?: boolean;
    readonly isGenericParameter?: boolean;
    readonly isGenericTypeParameter?: boolean;
    readonly isGenericMethodParameter?: boolean;
    readonly isGenericType?: boolean;
    readonly isGenericTypeDefinition?: boolean;
    readonly isSZArray?: boolean;
    readonly isVariableBoundArray?: boolean;
    readonly isByRefLike?: boolean;
    readonly isFunctionPointer?: boolean;
    readonly isUnmanagedFunctionPointer?: boolean;
    readonly hasElementType?: boolean;
    readonly genericTypeArguments?: Array<Type> | null;
    readonly genericParameterPosition?: number;
    genericParameterAttributes?: GenericParameterAttributes;
    attributes?: TypeAttributes;
    readonly isAbstract?: boolean;
    readonly isImport?: boolean;
    readonly isSealed?: boolean;
    readonly isSpecialName?: boolean;
    readonly isClass?: boolean;
    readonly isNestedAssembly?: boolean;
    readonly isNestedFamANDAssem?: boolean;
    readonly isNestedFamily?: boolean;
    readonly isNestedFamORAssem?: boolean;
    readonly isNestedPrivate?: boolean;
    readonly isNestedPublic?: boolean;
    readonly isNotPublic?: boolean;
    readonly isPublic?: boolean;
    readonly isAutoLayout?: boolean;
    readonly isExplicitLayout?: boolean;
    readonly isLayoutSequential?: boolean;
    readonly isAnsiClass?: boolean;
    readonly isAutoClass?: boolean;
    readonly isUnicodeClass?: boolean;
    readonly isCOMObject?: boolean;
    readonly isContextful?: boolean;
    readonly isEnum?: boolean;
    readonly isMarshalByRef?: boolean;
    readonly isPrimitive?: boolean;
    readonly isValueType?: boolean;
    readonly isSignatureType?: boolean;
    readonly isSecurityCritical?: boolean;
    readonly isSecuritySafeCritical?: boolean;
    readonly isSecurityTransparent?: boolean;
    structLayoutAttribute?: StructLayoutAttribute;
    typeInitializer?: ConstructorInfo;
    typeHandle?: RuntimeTypeHandle;
    readonly guid?: string;
    baseType?: Type;
    /**
     * @deprecated
     */
    readonly isSerializable?: boolean;
    readonly containsGenericParameters?: boolean;
    readonly isVisible?: boolean;
};

export type TypeAttributes = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 16 | 24 | 32 | 128 | 256 | 1024 | 2048 | 4096 | 8192 | 16384 | 65536 | 131072 | 196608 | 262144 | 264192 | 1048576 | 12582912;

export type TypeInfo = {
    readonly name?: (string) | null;
    readonly customAttributes?: Array<CustomAttributeData> | null;
    readonly isCollectible?: boolean;
    readonly metadataToken?: number;
    readonly isInterface?: boolean;
    memberType?: MemberTypes;
    readonly namespace?: (string) | null;
    readonly assemblyQualifiedName?: (string) | null;
    readonly fullName?: (string) | null;
    assembly?: Assembly;
    module?: Module;
    readonly isNested?: boolean;
    declaringType?: Type;
    declaringMethod?: MethodBase;
    reflectedType?: Type;
    underlyingSystemType?: Type;
    readonly isTypeDefinition?: boolean;
    readonly isArray?: boolean;
    readonly isByRef?: boolean;
    readonly isPointer?: boolean;
    readonly isConstructedGenericType?: boolean;
    readonly isGenericParameter?: boolean;
    readonly isGenericTypeParameter?: boolean;
    readonly isGenericMethodParameter?: boolean;
    readonly isGenericType?: boolean;
    readonly isGenericTypeDefinition?: boolean;
    readonly isSZArray?: boolean;
    readonly isVariableBoundArray?: boolean;
    readonly isByRefLike?: boolean;
    readonly isFunctionPointer?: boolean;
    readonly isUnmanagedFunctionPointer?: boolean;
    readonly hasElementType?: boolean;
    readonly genericTypeArguments?: Array<Type> | null;
    readonly genericParameterPosition?: number;
    genericParameterAttributes?: GenericParameterAttributes;
    attributes?: TypeAttributes;
    readonly isAbstract?: boolean;
    readonly isImport?: boolean;
    readonly isSealed?: boolean;
    readonly isSpecialName?: boolean;
    readonly isClass?: boolean;
    readonly isNestedAssembly?: boolean;
    readonly isNestedFamANDAssem?: boolean;
    readonly isNestedFamily?: boolean;
    readonly isNestedFamORAssem?: boolean;
    readonly isNestedPrivate?: boolean;
    readonly isNestedPublic?: boolean;
    readonly isNotPublic?: boolean;
    readonly isPublic?: boolean;
    readonly isAutoLayout?: boolean;
    readonly isExplicitLayout?: boolean;
    readonly isLayoutSequential?: boolean;
    readonly isAnsiClass?: boolean;
    readonly isAutoClass?: boolean;
    readonly isUnicodeClass?: boolean;
    readonly isCOMObject?: boolean;
    readonly isContextful?: boolean;
    readonly isEnum?: boolean;
    readonly isMarshalByRef?: boolean;
    readonly isPrimitive?: boolean;
    readonly isValueType?: boolean;
    readonly isSignatureType?: boolean;
    readonly isSecurityCritical?: boolean;
    readonly isSecuritySafeCritical?: boolean;
    readonly isSecurityTransparent?: boolean;
    structLayoutAttribute?: StructLayoutAttribute;
    typeInitializer?: ConstructorInfo;
    typeHandle?: RuntimeTypeHandle;
    readonly guid?: string;
    baseType?: Type;
    /**
     * @deprecated
     */
    readonly isSerializable?: boolean;
    readonly containsGenericParameters?: boolean;
    readonly isVisible?: boolean;
    readonly genericTypeParameters?: Array<Type> | null;
    readonly declaredConstructors?: Array<ConstructorInfo> | null;
    readonly declaredEvents?: Array<EventInfo> | null;
    readonly declaredFields?: Array<FieldInfo> | null;
    readonly declaredMembers?: Array<MemberInfo> | null;
    readonly declaredMethods?: Array<MethodInfo> | null;
    readonly declaredNestedTypes?: Array<TypeInfo> | null;
    readonly declaredProperties?: Array<PropertyInfo> | null;
    readonly implementedInterfaces?: Array<Type> | null;
};

export type VariableDTO = {
    name?: (string) | null;
    type?: (string) | null;
    displayValue?: (string) | null;
    generation?: number;
};

export type WorkflowDTO = {
    name?: (string) | null;
    description?: (string) | null;
    steps?: Array<StepDTO> | null;
};

export type GetApiV1StepWiseControllerV1GetResponse = (unknown);

export type GetApiV1StepWiseControllerV1GetError = unknown;

export type GetApiV1StepWiseControllerV1VersionResponse = (string);

export type GetApiV1StepWiseControllerV1VersionError = unknown;

export type GetApiV1StepWiseControllerV1GetStepData = {
    query?: {
        stepName?: string;
        workflowName?: string;
    };
};

export type GetApiV1StepWiseControllerV1GetStepResponse = (StepDTO);

export type GetApiV1StepWiseControllerV1GetStepError = unknown;

export type GetApiV1StepWiseControllerV1GetWorkflowData = {
    query?: {
        workflowName?: string;
    };
};

export type GetApiV1StepWiseControllerV1GetWorkflowResponse = (WorkflowDTO);

export type GetApiV1StepWiseControllerV1GetWorkflowError = unknown;

export type GetApiV1StepWiseControllerV1ListWorkflowResponse = (Array<WorkflowDTO>);

export type GetApiV1StepWiseControllerV1ListWorkflowError = unknown;

export type PostApiV1StepWiseControllerV1ExecuteStepData = {
    query?: {
        maxParallel?: number;
        maxSteps?: number;
        step?: string;
        workflow?: string;
    };
};

export type PostApiV1StepWiseControllerV1ExecuteStepResponse = (Array<StepRunDTO>);

export type PostApiV1StepWiseControllerV1ExecuteStepError = unknown;