# Vercel Deployment Guide

This guide explains how to deploy the Image OCR Web App to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **N8N Instance**: You need a publicly accessible N8N instance for the OCR webhook

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository: `HermanTeng19/img-ocr-web-app`
4. Vercel will automatically detect it's a Node.js project

### 2. Configure Environment Variables

In the Vercel dashboard, go to your project settings and add these environment variables:

```bash
# Required for production
NODE_ENV=production

# Your N8N webhook URL (replace with your actual N8N instance)
OCR_WEBHOOK_URL=https://your-n8n-instance.com/webhook/773ced4a-d812-4ecf-84e8-ee3bfefe277f

# Your Vercel app URL (will be provided after deployment)
CALLBACK_BASE_URL=https://your-app-name.vercel.app
```

### 3. Deploy

1. Click "Deploy" in Vercel dashboard
2. Wait for deployment to complete
3. Note your deployment URL (e.g., `https://img-ocr-web-app.vercel.app`)

### 4. Update Environment Variables

After deployment, update the `CALLBACK_BASE_URL` with your actual Vercel URL:

```bash
CALLBACK_BASE_URL=https://img-ocr-web-app.vercel.app
```

## Important Notes

### File Storage Limitations

⚠️ **Vercel has an ephemeral filesystem**, which means:

- Uploaded images are **not permanently stored**
- Images are processed in memory only
- The `/uploads/:filename` endpoint returns an error in production
- This is normal behavior for Vercel serverless functions

### Webhook Configuration

Your N8N webhook must be publicly accessible:

1. **Local N8N**: Use ngrok or similar tunneling service
2. **Cloud N8N**: Ensure your N8N instance is publicly accessible
3. **Update webhook URL**: Use the public URL in environment variables

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `OCR_WEBHOOK_URL` | Your N8N webhook URL | `https://n8n.example.com/webhook/abc123` |
| `CALLBACK_BASE_URL` | Your Vercel app URL | `https://img-ocr-web-app.vercel.app` |

## Testing Deployment

1. **Upload an image** through the web interface
2. **Check processing status** - it should show "processing"
3. **Verify webhook call** - check your N8N logs
4. **Check results** - OCR results should appear after processing

## Troubleshooting

### Common Issues

1. **Webhook not called**
   - Check `OCR_WEBHOOK_URL` is correct
   - Ensure N8N instance is publicly accessible
   - Check Vercel function logs

2. **Images not displaying**
   - This is expected in production (ephemeral filesystem)
   - Images are processed in memory only

3. **Environment variables not working**
   - Redeploy after adding environment variables
   - Check variable names are exact matches

### Checking Logs

1. Go to Vercel dashboard
2. Select your project
3. Go to "Functions" tab
4. Click on a function execution to see logs

## Alternative Deployment Options

If you need persistent file storage, consider:

1. **Railway**: Supports persistent file storage
2. **Heroku**: With add-ons for file storage
3. **DigitalOcean App Platform**: With persistent volumes
4. **AWS/GCP/Azure**: With S3/Cloud Storage integration

## Local Development

For local development with the same configuration:

1. Copy `env.example` to `.env`
2. Update URLs for local development
3. Run `npm run dev`

```bash
# .env file for local development
NODE_ENV=development
OCR_WEBHOOK_URL=http://localhost:5678/webhook/773ced4a-d812-4ecf-84e8-ee3bfefe277f
CALLBACK_BASE_URL=http://localhost:3000
```

## Support

If you encounter issues:

1. Check Vercel function logs
2. Verify environment variables
3. Test webhook URL accessibility
4. Check N8N instance status
