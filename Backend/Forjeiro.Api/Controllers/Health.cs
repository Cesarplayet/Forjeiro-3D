using Microsoft.AspNetCore.Mvc;

namespace forjeiro.api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            Status = "Online",
            Application = "Forjeiro 3D API"
        });
    }
}