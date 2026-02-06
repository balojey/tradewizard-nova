/**
 * AWS Bedrock Client for Amazon Nova Models
 * 
 * Manages AWS Bedrock authentication and model instantiation for Nova models.
 * Integrates with LangChain's BedrockChat wrapper for seamless multi-provider support.
 */

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { fromEnv } from '@aws-sdk/credential-providers';
import { BedrockChat } from '@langchain/community/chat_models/bedrock';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * Configuration for Nova model instantiation
 */
export interface NovaModelConfig {
  /** AWS Bedrock model ID (e.g., "amazon.nova-micro-v1:0") */
  modelId: string;
  /** AWS region for Bedrock service */
  region: string;
  /** Temperature for response randomness (0.0 - 1.0) */
  temperature?: number;
  /** Maximum output tokens */
  maxTokens?: number;
  /** Nucleus sampling parameter (0.0 - 1.0) */
  topP?: number;
  /** Optional explicit AWS credentials */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * Metadata for Nova model variants with pricing information
 */
export interface NovaModelVariant {
  /** Short identifier (e.g., "micro", "lite", "pro") */
  id: string;
  /** Display name */
  name: string;
  /** Full AWS Bedrock model ID */
  modelId: string;
  /** Cost per 1K input tokens in USD */
  inputCostPer1kTokens: number;
  /** Cost per 1K output tokens in USD */
  outputCostPer1kTokens: number;
  /** Maximum supported tokens */
  maxTokens: number;
}

/**
 * AWS Bedrock client for Nova model management
 */
export class BedrockClient {
  private client: BedrockRuntimeClient;
  private config: NovaModelConfig;

  /**
   * Create a new Bedrock client instance
   * 
   * @param config - Nova model configuration
   */
  constructor(config: NovaModelConfig) {
    this.config = config;

    // Initialize Bedrock Runtime client with region and credentials
    const clientConfig: any = {
      region: config.region,
    };

    // Use explicit credentials if provided, otherwise use AWS default credential chain
    if (config.credentials) {
      clientConfig.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      };
    } else {
      // Use AWS SDK default credential provider chain
      // This will check: environment variables, shared credentials file, IAM role, etc.
      clientConfig.credentials = fromEnv();
    }

    this.client = new BedrockRuntimeClient(clientConfig);
  }

  /**
   * Create a LangChain-compatible chat model instance for Nova
   * 
   * @returns BaseChatModel instance configured for the specified Nova model
   */
  createChatModel(): BaseChatModel {
    const modelConfig: any = {
      model: this.config.modelId,
      region: this.config.region,
      temperature: this.config.temperature ?? 0.7,
    };

    // Add optional parameters if specified
    if (this.config.maxTokens !== undefined) {
      modelConfig.maxTokens = this.config.maxTokens;
    }

    if (this.config.topP !== undefined) {
      modelConfig.topP = this.config.topP;
    }

    // Add credentials if explicitly provided
    if (this.config.credentials) {
      modelConfig.credentials = {
        accessKeyId: this.config.credentials.accessKeyId,
        secretAccessKey: this.config.credentials.secretAccessKey,
      };
    }

    return new BedrockChat(modelConfig);
  }

  /**
   * Validate AWS credentials and Bedrock access
   * 
   * Performs a lightweight health check to ensure:
   * - AWS credentials are valid
   * - Bedrock service is accessible in the specified region
   * - The specified model is available
   * 
   * @returns Promise<boolean> - true if connection is valid
   * @throws Error with descriptive message if validation fails
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Attempt to create a model instance and validate it can be initialized
      // This will fail fast if credentials are invalid or region is unsupported
      const model = this.createChatModel();
      
      // The model creation itself validates the configuration
      // If we get here without errors, the connection is valid
      return true;
    } catch (error: any) {
      // Provide descriptive error messages for common failure scenarios
      if (error.name === 'CredentialsProviderError') {
        throw new Error(
          'AWS credentials not found or invalid. Please ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set, ' +
          'or configure AWS credentials using the AWS CLI: aws configure'
        );
      }

      if (error.name === 'UnrecognizedClientException') {
        throw new Error(
          `AWS region "${this.config.region}" does not support Amazon Bedrock. ` +
          'Please use a supported region (e.g., us-east-1, us-west-2)'
        );
      }

      if (error.message?.includes('ResourceNotFoundException')) {
        throw new Error(
          `Nova model "${this.config.modelId}" not found in region "${this.config.region}". ` +
          'Please verify the model ID and ensure Bedrock access is enabled in your AWS account.'
        );
      }

      // Re-throw with original error for unexpected failures
      throw new Error(`Bedrock connection validation failed: ${error.message}`);
    }
  }

  /**
   * Get available Nova model variants with pricing information
   * 
   * @returns Array of Nova model variants with metadata
   */
  static getAvailableModels(): NovaModelVariant[] {
    return [
      {
        id: 'micro',
        name: 'Nova Micro',
        modelId: 'amazon.nova-micro-v1:0',
        inputCostPer1kTokens: 0.000035,
        outputCostPer1kTokens: 0.00014,
        maxTokens: 8192,
      },
      {
        id: 'lite',
        name: 'Nova Lite',
        modelId: 'amazon.nova-lite-v1:0',
        inputCostPer1kTokens: 0.00006,
        outputCostPer1kTokens: 0.00024,
        maxTokens: 8192,
      },
      {
        id: 'pro',
        name: 'Nova Pro',
        modelId: 'amazon.nova-pro-v1:0',
        inputCostPer1kTokens: 0.0008,
        outputCostPer1kTokens: 0.0032,
        maxTokens: 8192,
      },
    ];
  }

  /**
   * Validate that a model ID is a valid Nova model identifier
   * 
   * @param modelId - Model ID to validate
   * @returns true if the model ID is valid
   */
  static validateModelId(modelId: string): boolean {
    const validModelIds = BedrockClient.getAvailableModels().map(m => m.modelId);
    return validModelIds.includes(modelId);
  }
}
