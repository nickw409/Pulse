variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "pulse"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "pulse"
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "clerk_publishable_key" {
  description = "Clerk publishable key"
  type        = string
  sensitive   = true
}

variable "clerk_secret_key" {
  description = "Clerk secret key"
  type        = string
  sensitive   = true
}

variable "web_image" {
  description = "ECR image URI for web service"
  type        = string
}

variable "ingestion_image" {
  description = "ECR image URI for ingestion service"
  type        = string
}

variable "consumer_image" {
  description = "ECR image URI for consumer service"
  type        = string
}
