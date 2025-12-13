// Cron job function to send review emails to guests 24 hours after reservation creation
// Only sends to fully paid reservations that haven't received an email yet

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const FROM_EMAIL = "info@londoners.com"
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

console.log("Send Reservation Emails Cron Job Loaded!")

// Helper function to validate SendGrid API key format
function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith('SG.') && key.length > 20
}

// Function to send review email via SendGrid
async function sendReviewEmail(
  guestEmail: string,
  guestFirstName: string,
  guestLastName: string,
  confirmationCode: string,
  listingId: string,
  listingTitle: string,
  guestId: string
): Promise<boolean> {
  if (!SENDGRID_API_KEY || !isValidApiKeyFormat(SENDGRID_API_KEY)) {
    console.error("Invalid or missing SendGrid API key")
    return false
  }

  const emailSubject = "How was your stay? Share your experience"
  const reviewLink = `https://londoner.vercel.app/rate?listing_id=${listingId}&listing_title=${encodeURIComponent(listingTitle)}&guest_id=${guestId}`
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #0066cc; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">How Was Your Stay?</h1>
      </div>
      
      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Dear ${guestFirstName} ${guestLastName},</p>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Thank you for staying with us! We hope you had a wonderful experience at <strong>${listingTitle}</strong>.
        </p>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          We would love to hear about your stay. Your feedback helps us improve and assists other guests in making their decisions.
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${reviewLink}" 
             style="background-color: #0066cc; 
                    color: white; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-size: 18px; 
                    font-weight: bold;
                    display: inline-block;">
            Rate Your Stay
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
          Your confirmation code: <strong style="color: #0066cc;">${confirmationCode}</strong>
        </p>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 30px;">
          Best regards,<br>
          <strong>The Londoners Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${reviewLink}</p>
      </div>
    </div>
  `

  const emailData = {
    personalizations: [
      {
        to: [{ email: guestEmail }],
        subject: emailSubject
      }
    ],
    from: { email: FROM_EMAIL },
    content: [
      {
        type: "text/html",
        value: emailContent
      }
    ]
  }

  try {
    console.log(`📧 Sending review email to: ${guestEmail}`)
    
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ SendGrid error for ${guestEmail}:`, errorText)
      return false
    }

    console.log(`✅ Email sent successfully to: ${guestEmail}`)
    return true

  } catch (error) {
    console.error(`❌ Error sending email to ${guestEmail}:`, error)
    return false
  }
}

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  console.log("🔄 Starting cron job: Send Reservation Emails")
  
  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Calculate 24 hours ago from now
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    console.log(`📅 Checking for reservations with check-out before: ${twentyFourHoursAgo.toISOString()}`)
    console.log(`   (i.e., guests who checked out 24+ hours ago)`)

    // Query reservations that meet all 3 conditions
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('email_sent', false)           // Condition 2: Email not sent
      .eq('is_fully_paid', true)          // Condition 3: Fully paid
      .lt('check_out', twentyFourHoursAgo.toISOString())  // Condition 1: Checked out 24+ hours ago

    if (error) {
      console.error("❌ Error fetching reservations:", error)
      throw error
    }

    console.log(`📊 Found ${reservations?.length || 0} reservations to process`)

    if (!reservations || reservations.length === 0) {
      console.log("✅ No reservations to process at this time")
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No reservations to process",
          processed: 0
        }),
        { 
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      )
    }

    // Process each reservation
    let successCount = 0
    let failCount = 0

    for (const reservation of reservations) {
      console.log(`\n📝 Processing reservation: ${reservation.guesty_reservation_id}`)
      console.log(`   Guest: ${reservation.guest_firstname} ${reservation.guest_lastname}`)
      console.log(`   Email: ${reservation.guest_email}`)
      console.log(`   Listing ID: ${reservation.unit_id}`)
      console.log(`   Listing Title: ${reservation.unit_title}`)
      console.log(`   Confirmation: ${reservation.confirmation_code}`)
      console.log(`   Guest ID: ${reservation.guest_id}`)

      // Send email
      const emailSent = await sendReviewEmail(
        reservation.guest_email,
        reservation.guest_firstname,
        reservation.guest_lastname,
        reservation.confirmation_code,
        reservation.unit_id,
        reservation.unit_title,
        reservation.guest_id
      )

      if (emailSent) {
        // Update database: mark email as sent
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ 
            email_sent: true,
            email_sent_at: new Date().toISOString()
          })
          .eq('reservation_id', reservation.reservation_id)

        if (updateError) {
          console.error(`❌ Failed to update database for reservation ${reservation.guesty_reservation_id}:`, updateError)
          failCount++
        } else {
          console.log(`✅ Successfully processed reservation ${reservation.guesty_reservation_id}`)
          successCount++
        }
      } else {
        console.error(`❌ Failed to send email for reservation ${reservation.guesty_reservation_id}`)
        failCount++
      }
    }

    console.log(`\n📊 Cron job completed:`)
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Failed: ${failCount}`)
    console.log(`   📧 Total processed: ${reservations.length}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Cron job completed",
        processed: reservations.length,
        successful: successCount,
        failed: failCount
      }),
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )

  } catch (error) {
    console.error("❌ Cron job error:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Cron job failed",
        details: errorMessage
      }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )
  }
})