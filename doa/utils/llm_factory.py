"""LLM factory for creating Digital Ocean AI instances via OpenAI-compatible API."""

import logging
import os
import json
import re
from typing import Optional, Type, TypeVar
from pydantic import BaseModel, ValidationError

from langchain_openai import ChatOpenAI
from langchain_core.language_models import BaseChatModel
from langchain_core.output_parsers import BaseOutputParser
from langchain_core.prompts import ChatPromptTemplate

from config import EngineConfig, LLMConfig

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class StructuredOutputParser:
    """
    Custom output parser for Digital Ocean API that extracts JSON from markdown responses.
    
    Digital Ocean's API doesn't support OpenAI's structured output modes, so we need to:
    1. Extract JSON from markdown code blocks or plain text
    2. Parse and validate against the Pydantic model
    3. Handle parsing errors gracefully
    """
    
    def __init__(self, pydantic_model: Type[T]):
        self.pydantic_model = pydantic_model
    
    def parse(self, text: str) -> T:
        """Parse LLM output and extract structured data."""
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find JSON object in the text
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                # No JSON found, try to parse the entire text as JSON
                json_str = text.strip()
        
        try:
            # Parse JSON and validate with Pydantic model
            data = json.loads(json_str)
            return self.pydantic_model.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Failed to parse structured output: {e}")
            logger.debug(f"Raw text: {text[:500]}")
            raise ValueError(f"Could not parse structured output from LLM response: {e}")
    
    def get_format_instructions(self) -> str:
        """Return format instructions for the LLM."""
        schema = self.pydantic_model.model_json_schema()
        return f"""You must respond with a valid JSON object that matches this schema:

{json.dumps(schema, indent=2)}

Wrap your JSON response in a markdown code block like this:
```json
{{
  "field1": "value1",
  "field2": "value2"
}}
```

IMPORTANT: Your response must be valid JSON that can be parsed. Do not include any explanatory text outside the JSON object."""


def create_llm_instance(
    config: LLMConfig,
    opik_config: Optional[dict] = None,
    structured_output_model: Optional[Type[T]] = None
) -> BaseChatModel:
    """
    Create a Digital Ocean AI LLM instance via OpenAI-compatible API.
    
    Args:
        config: LLM configuration with model name, temperature, etc.
        opik_config: Optional Opik callback configuration for tracing (unused, for compatibility)
        structured_output_model: Optional Pydantic model for structured output
        
    Returns:
        Configured ChatOpenAI instance with custom structured output parsing
        
    Example:
        >>> from models.types import AgentSignal
        >>> llm = create_llm_instance(
        ...     config=engine_config.llm,
        ...     structured_output_model=AgentSignal
        ... )
    """
    try:
        # Create ChatOpenAI instance with Digital Ocean base URL
        base_llm = ChatOpenAI(
            base_url="https://inference.do-ai.run/v1/",
            api_key=config.api_key,
            model=config.model_name,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            timeout=config.timeout_ms / 1000,  # Convert ms to seconds
        )
        
        logger.info(
            f"Created Digital Ocean AI client: model={config.model_name}, "
            f"temperature={config.temperature}, max_tokens={config.max_tokens}"
        )
        
        # Add custom structured output parser for Digital Ocean API
        if structured_output_model:
            parser = StructuredOutputParser(pydantic_model=structured_output_model)
            
            # Get format instructions
            format_instructions = parser.get_format_instructions()
            
            # Wrap the LLM to inject format instructions and parse output
            class StructuredOutputLLM:
                """Wrapper that adds structured output parsing to LLM."""
                
                def __init__(self, llm, parser, format_instructions):
                    self.llm = llm
                    self.parser = parser
                    self.format_instructions = format_instructions
                
                def _inject_format_instructions(self, messages):
                    """Inject format instructions into the system message."""
                    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
                    
                    new_messages = []
                    system_injected = False
                    
                    for msg in messages:
                        if isinstance(msg, SystemMessage) and not system_injected:
                            # Append format instructions to existing system message
                            new_content = f"{msg.content}\n\n{self.format_instructions}"
                            new_messages.append(SystemMessage(content=new_content))
                            system_injected = True
                        else:
                            new_messages.append(msg)
                    
                    # If no system message, add one at the beginning
                    if not system_injected:
                        new_messages.insert(0, SystemMessage(content=self.format_instructions))
                    
                    return new_messages
                
                async def ainvoke(self, messages, **kwargs):
                    """Async invoke with structured output parsing."""
                    # Inject format instructions
                    messages_with_instructions = self._inject_format_instructions(messages)
                    
                    # Call LLM
                    response = await self.llm.ainvoke(messages_with_instructions, **kwargs)
                    
                    # Parse the response content
                    if hasattr(response, 'content'):
                        content = response.content
                    else:
                        content = str(response)
                    
                    # Parse and return structured output
                    return self.parser.parse(content)
                
                def invoke(self, messages, **kwargs):
                    """Sync invoke with structured output parsing."""
                    # Inject format instructions
                    messages_with_instructions = self._inject_format_instructions(messages)
                    
                    # Call LLM
                    response = self.llm.invoke(messages_with_instructions, **kwargs)
                    
                    # Parse the response content
                    if hasattr(response, 'content'):
                        content = response.content
                    else:
                        content = str(response)
                    
                    # Parse and return structured output
                    return self.parser.parse(content)
                
                def bind(self, **kwargs):
                    """Pass through bind to underlying LLM."""
                    self.llm = self.llm.bind(**kwargs)
                    return self
            
            llm = StructuredOutputLLM(base_llm, parser, format_instructions)
            
            logger.info(
                f"Configured custom structured output parser for: {structured_output_model.__name__}"
            )
            
            return llm
        
        return base_llm
        
    except Exception as e:
        logger.error(f"Failed to create LLM instance: {e}")
        raise


def create_agent_llm(
    config: EngineConfig,
    agent_name: str,
    output_model: Type[T]
) -> BaseChatModel:
    """
    Create an LLM instance specifically configured for an agent.
    
    This is a convenience wrapper around create_llm_instance that:
    - Uses the engine's LLM configuration
    - Configures structured output for the agent's signal type
    - Digital Ocean provides automatic observability
    
    Args:
        config: Engine configuration
        agent_name: Name of the agent (for tracing tags)
        output_model: Pydantic model for agent output (e.g., AgentSignal)
        
    Returns:
        Configured LLM instance ready for agent use
        
    Example:
        >>> from models.types import AgentSignal
        >>> llm = create_agent_llm(
        ...     config=engine_config,
        ...     agent_name="market_microstructure",
        ...     output_model=AgentSignal
        ... )
    """
    # Digital Ocean Gradient provides automatic observability
    # No need for Opik integration
    return create_llm_instance(
        config=config.llm,
        opik_config=None,
        structured_output_model=output_model
    )


