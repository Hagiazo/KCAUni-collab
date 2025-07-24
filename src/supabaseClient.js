import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msomycowiimnuoevkyas.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zb215Y293aWltbnVvZXZreWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNDU2MTcsImV4cCI6MjA2ODkyMTYxN30.yOL4b83AR0ZxIrOQfV0adHbiAJFo4dvCzrXlAQsep9o' 
const supabase = createClient(supabaseUrl, supabaseKey)