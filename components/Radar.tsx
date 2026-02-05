
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { WikiArticle, GeoPoint } from '../types';
import { calculateBearing } from '../utils';

interface RadarProps {
  userCoords: GeoPoint;
  articles: WikiArticle[];
  radius: number;
}

const Radar: React.FC<RadarProps> = ({ userCoords, articles, radius }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 400;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 40;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("width", "100%")
      .style("height", "auto");

    svg.selectAll("*").remove();

    // Defs for gradients
    const defs = svg.append("defs");
    const gradient = defs.append("radialGradient")
      .attr("id", "radar-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "rgba(0, 255, 65, 0.15)");
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "rgba(0, 0, 0, 1)");

    // Background circle
    svg.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", maxRadius)
      .attr("fill", "url(#radar-gradient)")
      .attr("stroke", "rgba(0, 255, 65, 0.2)")
      .attr("stroke-width", 1);

    // Range rings
    [0.25, 0.5, 0.75].forEach(c => {
      svg.append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", maxRadius * c)
        .attr("fill", "none")
        .attr("stroke", "rgba(0, 255, 65, 0.1)")
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", "4 4");
    });

    // Crosshairs
    svg.append("line").attr("x1", centerX).attr("y1", centerY - maxRadius).attr("x2", centerX).attr("y2", centerY + maxRadius).attr("stroke", "rgba(0, 255, 65, 0.05)");
    svg.append("line").attr("x1", centerX - maxRadius).attr("y1", centerY).attr("x2", centerX + maxRadius).attr("y2", centerY).attr("stroke", "rgba(0, 255, 65, 0.05)");

    // Plot articles
    articles.forEach(article => {
      const bearing = calculateBearing(userCoords, { lat: article.lat, lng: article.lon });
      // Use linear distance mapping for visibility
      const distRatio = Math.min(article.dist / radius, 1);
      const r = distRatio * maxRadius;
      
      const x = centerX + r * Math.sin(bearing * Math.PI / 180);
      const y = centerY - r * Math.cos(bearing * Math.PI / 180);

      const dotGroup = svg.append("g")
        .style("cursor", "crosshair");

      // Glow effect for blip
      dotGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 5)
        .attr("fill", "rgba(0, 255, 65, 0.2)")
        .append("animate")
          .attr("attributeName", "r")
          .attr("values", "4;8;4")
          .attr("dur", "2s")
          .attr("repeatCount", "indefinite");

      dotGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 2.5)
        .attr("fill", "#00ff41")
        .attr("stroke", "white")
        .attr("stroke-width", 0.5);

      dotGroup.append("text")
        .attr("x", x + 8)
        .attr("y", y - 8)
        .text(article.title.toUpperCase())
        .attr("fill", "rgba(0, 255, 65, 0.7)")
        .attr("font-size", "9px")
        .attr("font-weight", "bold")
        .attr("font-family", "monospace")
        .style("pointer-events", "none");
    });

    // Sweep line
    const sweep = svg.append("line")
      .attr("x1", centerX)
      .attr("y1", centerY)
      .attr("x2", centerX)
      .attr("y2", centerY - maxRadius)
      .attr("stroke", "rgba(0, 255, 65, 0.6)")
      .attr("stroke-width", 2);

    // User "You" blip in center
    svg.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", 3)
      .attr("fill", "#fff")
      .attr("class", "user-blip")
      .style("filter", "drop-shadow(0 0 5px rgba(255,255,255,0.8))");

    let angle = 0;
    const animate = () => {
      angle = (angle + 1.5) % 360;
      const rad = angle * Math.PI / 180;
      const x2 = centerX + maxRadius * Math.sin(rad);
      const y2 = centerY - maxRadius * Math.cos(rad);
      sweep.attr("x2", x2).attr("y2", y2);
      requestAnimationFrame(animate);
    };
    animate();

  }, [articles, userCoords, radius]);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square bg-black/80 border border-green-500/20 rounded-full overflow-hidden shadow-[0_0_80px_rgba(0,255,65,0.1)]">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-green-500 font-mono tracking-[0.5em] font-bold opacity-60">NORTH</div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-green-500/40 font-mono uppercase">Range: {radius}m</div>
      
      {/* Decorative radar noise/scratches */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
    </div>
  );
};

export default Radar;
